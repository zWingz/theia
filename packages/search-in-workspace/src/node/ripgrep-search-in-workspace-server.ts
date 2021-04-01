/********************************************************************************
 * Copyright (C) 2017-2018 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { ILogger } from '@theia/core';
import { RawProcess, RawProcessFactory, RawProcessOptions } from '@theia/process/lib/node';
import { FileUri } from '@theia/core/lib/node/file-uri';
import URI from '@theia/core/lib/common/uri';
import { inject, injectable } from '@theia/core/shared/inversify';
import { SearchInWorkspaceServer, SearchInWorkspaceOptions, SearchInWorkspaceResult, SearchInWorkspaceClient, LinePreview } from '../common/search-in-workspace-interface';
import { RipgrepSearchUtils } from './ripgrep-search-utils';

export const RgPath = Symbol('RgPath');

/**
 * Typing for ripgrep's arbitrary data object:
 *
 *   https://docs.rs/grep-printer/0.1.0/grep_printer/struct.JSON.html#object-arbitrary-data
 */
export type IRgBytesOrText = { bytes: string } | { text: string };

function bytesOrTextToString(obj: IRgBytesOrText): string {
    return 'bytes' in obj ?
        Buffer.from(obj.bytes, 'base64').toString() :
        obj.text;
}

type IRgMessage = IRgMatch | IRgBegin | IRgEnd;

interface IRgMatch {
    type: 'match';
    data: {
        path: IRgBytesOrText;
        lines: IRgBytesOrText;
        line_number: number;
        absolute_offset: number;
        submatches: IRgSubmatch[];
    };
}

export interface IRgSubmatch {
    match: IRgBytesOrText;
    start: number;
    end: number;
}

interface IRgBegin {
    type: 'begin';
    data: {
        path: IRgBytesOrText;
        lines: string;
    };
}

interface IRgEnd {
    type: 'end';
    data: {
        path: IRgBytesOrText;
    };
}

@injectable()
export class RipgrepSearchInWorkspaceServer implements SearchInWorkspaceServer {

    // List of ongoing searches, maps search id to a the started rg process.
    private ongoingSearches: Map<number, RawProcess> = new Map();

    // Each incoming search is given a unique id, returned to the client.  This is the next id we will assigned.
    private nextSearchId: number = 1;

    private client: SearchInWorkspaceClient | undefined;

    @inject(RgPath)
    protected readonly rgPath: string;

    constructor(
        @inject(ILogger) protected readonly logger: ILogger,
        @inject(RawProcessFactory) protected readonly rawProcessFactory: RawProcessFactory,
    ) { }

    setClient(client: SearchInWorkspaceClient | undefined): void {
        this.client = client;
    }

    protected getArgs(options?: SearchInWorkspaceOptions): string[] {
        const args = new Set<string>();

        const appendGlobArgs = (rawPatterns: string[], exclude: boolean) => {
            rawPatterns.forEach(rawPattern => {
                if (rawPattern !== '') {
                    const globArguments = this.patternToGlobCLIArguments(rawPattern, exclude);
                    globArguments.forEach(arg => args.add(arg));
                }
            });
        };

        args.add('--hidden');
        args.add('--json');

        if (options && options.matchCase) {
            args.add('--case-sensitive');
        } else {
            args.add('--ignore-case');
        }

        if (options && options.includeIgnored) {
            args.add('--no-ignore');
        }
        if (options && options.maxFileSize) {
            args.add('--max-filesize=' + options.maxFileSize.trim());
        } else {
            args.add('--max-filesize=20M');
        }

        if (options && options.include) {
            appendGlobArgs(options.include, false);
        }

        if (options && options.exclude) {
            appendGlobArgs(options.exclude, true);
        }

        if (options && options.useRegExp || options && options.matchWholeWord) {
            args.add('--regexp');
        } else {
            args.add('--fixed-strings');
            args.add('--');
        }

        return Array.from(args);
    }

    /**
     * Transforms a given file pattern to 'ripgrep' glob CLI arguments.
     */
    protected patternToGlobCLIArguments(pattern: string, exclude: boolean): string[] {
        const globCommandArgument = '--glob=';
        const excludeChar = exclude ? '!' : '';
        const subDirGlobPattern = '**/';

        const subDirGlobPrefix = pattern.startsWith('/') ? '**' : subDirGlobPattern;
        const updatedPattern = pattern.startsWith(subDirGlobPattern) ? pattern : `${subDirGlobPrefix}${pattern}`;

        const globArgument = `${globCommandArgument}${excludeChar}${updatedPattern}`;

        const globArgumentsArray = [globArgument];
        if (!globArgument.endsWith('*')) {
            // Add a generic glob CLI argument entry to include files inside a given directory.
            const suffix = globArgument.endsWith('/') ? '*' : '/*';
            globArgumentsArray.push(`${globArgument}${suffix}`);
        }

        return globArgumentsArray;
    };

    /**
     * By default, sets the search directories for the string WHAT to the provided ROOTURIS directories
     * and returns the assigned search id.
     *
     * The include / exclude (options in SearchInWorkspaceOptions) are lists of patterns for files to
     * include / exclude during search (glob characters are allowed).
     *
     * include patterns successfully recognized as absolute paths will override the default search and set
     * the search directories to the ones provided as includes.
     * Relative paths are allowed, the application will attempt to translate them to valid absolute paths
     * based on the applicable search directories.
     */
    search(what: string, rootUris: string[], opts?: SearchInWorkspaceOptions): Promise<number> {
        // Start the rg process.  Use --vimgrep to get one result per
        // line, --color=always to get color control characters that
        // we'll use to parse the lines.
        const searchId = this.nextSearchId++;
        const rootPaths = rootUris.map(root => FileUri.fsPath(root));
        const searchPaths: string[] = this.resolveSearchPathsFromIncludes(rootPaths, opts);
        this.includesExcludesToAbsolute(searchPaths, opts);
        const rgArgs = this.getArgs(opts);
        // if we use matchWholeWord we use regExp internally,
        // so, we need to escape regexp characters if we actually not set regexp true in UI.
        if (opts && opts.matchWholeWord && !opts.useRegExp) {
            what = what.replace(/[\-\\\{\}\*\+\?\|\^\$\.\[\]\(\)\#]/g, '\\$&');
            if (!/\B/.test(what.charAt(0))) {
                what = '\\b' + what;
            }
            if (!/\B/.test(what.charAt(what.length - 1))) {
                what = what + '\\b';
            }
        }

        const args = [...rgArgs, what, ...searchPaths];
        const processOptions: RawProcessOptions = {
            command: this.rgPath,
            args
        };

        // TODO: Use child_process directly instead of rawProcessFactory?
        const rgProcess: RawProcess = this.rawProcessFactory(processOptions);
        this.ongoingSearches.set(searchId, rgProcess);

        rgProcess.onError(error => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let errorCode = (error as any).code;

            // Try to provide somewhat clearer error messages, if possible.
            if (errorCode === 'ENOENT') {
                errorCode = 'could not find the ripgrep (rg) binary';
            } else if (errorCode === 'EACCES') {
                errorCode = 'could not execute the ripgrep (rg) binary';
            }

            const errorStr = `An error happened while searching (${errorCode}).`;
            this.wrapUpSearch(searchId, errorStr);
        });

        // Running counter of results.
        let numResults = 0;

        // Buffer to accumulate incoming output.
        let databuf: string = '';

        let currentSearchResult: SearchInWorkspaceResult | undefined;

        rgProcess.outputStream.on('data', (chunk: Buffer) => {
            // We might have already reached the max number of
            // results, sent a TERM signal to rg, but we still get
            // the data that was already output in the mean time.
            // It's not necessary to return early here (the check
            // for maxResults below would avoid sending extra
            // results), but it avoids doing unnecessary work.
            if (opts && opts.maxResults && numResults >= opts.maxResults) {
                return;
            }

            databuf += chunk;

            while (1) {
                // Check if we have a complete line.
                const eolIdx = databuf.indexOf('\n');
                if (eolIdx < 0) {
                    break;
                }

                // Get and remove the line from the data buffer.
                const lineBuf = databuf.slice(0, eolIdx);
                databuf = databuf.slice(eolIdx + 1);

                const obj = JSON.parse(lineBuf) as IRgMessage;
                if (obj.type === 'begin') {
                    const file = bytesOrTextToString(obj.data.path);
                    if (file) {
                        currentSearchResult = {
                            fileUri: FileUri.create(file).toString(),
                            root: this.getRoot(file, rootUris).toString(),
                            matches: []
                        };
                    } else {
                        this.logger.error('Begin message without path. ' + JSON.stringify(obj));
                    }
                } else if (obj.type === 'end') {
                    if (currentSearchResult && this.client) {
                        this.client.onResult(searchId, currentSearchResult);
                    }
                    currentSearchResult = undefined;
                } else if (obj.type === 'match') {
                    if (!currentSearchResult) {
                        continue;
                    }
                    const data = obj.data;
                    const file = bytesOrTextToString(data.path);
                    const line = data.line_number;
                    const lineText = bytesOrTextToString(data.lines);

                    if (file === undefined || lineText === undefined) {
                        continue;
                    }

                    const lineInBytes = Buffer.from(lineText);

                    for (const submatch of data.submatches) {
                        const startOffset = lineInBytes.slice(0, submatch.start).toString().length;
                        const match = bytesOrTextToString(submatch.match);
                        let lineInfo: string | LinePreview = lineText.trimRight();
                        if (lineInfo.length > 300) {
                            const prefixLength = 25;
                            const start = Math.max(startOffset - prefixLength, 0);
                            const length = prefixLength + match.length + 70;
                            let prefix = '';
                            if (start >= prefixLength) {
                                prefix = '...';
                            }
                            const character = (start < prefixLength ? start : prefixLength) + prefix.length + 1;
                            lineInfo = <LinePreview>{
                                text: prefix + lineInfo.substr(start, length),
                                character
                            };
                        }
                        currentSearchResult.matches.push({
                            line,
                            character: startOffset + 1,
                            length: match.length,
                            lineText: lineInfo
                        });
                        numResults++;

                        // Did we reach the maximum number of results?
                        if (opts && opts.maxResults && numResults >= opts.maxResults) {
                            rgProcess.kill();
                            if (currentSearchResult && this.client) {
                                this.client.onResult(searchId, currentSearchResult);
                            }
                            currentSearchResult = undefined;
                            this.wrapUpSearch(searchId);
                            break;
                        }
                    }
                }
            }
        });

        rgProcess.outputStream.on('end', () => {
            // If we reached maxResults, we should have already
            // wrapped up the search.  Returning early avoids
            // logging a warning message in wrapUpSearch.
            if (opts && opts.maxResults && numResults >= opts.maxResults) {
                return;
            }

            this.wrapUpSearch(searchId);
        });

        return Promise.resolve(searchId);
    }

    /**
     * The default search paths are set to be the root paths associated to a workspace
     * however the search scope can be further refined with the include paths available in the search options.
     * This method will replace the searching paths to the ones specified in the 'include' options but as long
     * as the 'include' paths can be successfully validated as existing.
     *
     * Therefore the returned array of paths can be either the workspace root paths or a set of validated paths
     * derived from the include options which can be used to perform the search.
     *
     * Any pattern that resulted in a valid search path will be removed from the 'include' list as it is
     * provided as an equivalent search path instead.
     */
    protected resolveSearchPathsFromIncludes(rootPaths: string[], opts: SearchInWorkspaceOptions | undefined): string[] {
        if (!opts || !opts.include) {
            return rootPaths;
        }

        const { convertedPatterns, resolvedPaths } = RipgrepSearchUtils.resolvePatternsToPaths(opts.include, rootPaths);

        // Remove file patterns that were successfully translated to search paths.
        opts.include = opts.include.filter(item => !convertedPatterns.has(item));

        return resolvedPaths.size > 0 ? Array.from(resolvedPaths) : rootPaths;
    }

    /**
     * Transform include/exclude option patterns from relative patterns to absolute patterns.
     * E.g. './abc/foo.*' to '${root}/abc/foo.*', the transformation does not validate the
     * pattern against the file system as glob suffixes remain.
     */
    protected includesExcludesToAbsolute(searchPaths: string[], opts: SearchInWorkspaceOptions | undefined): void {
        [true, false].forEach(isInclude => {
            const patterns = isInclude ? opts?.include : opts?.exclude;
            if (!patterns) {
                return;
            }

            const updatedPatterns = RipgrepSearchUtils.replaceRelativeToAbsolute(patterns, searchPaths);

            if (isInclude) {
                opts!.include = updatedPatterns;
            } else {
                opts!.exclude = updatedPatterns;
            }
        });
    }

    /**
     * Returns the root folder uri that a file belongs to.
     * In case that a file belongs to more than one root folders, returns the root folder that is closest to the file.
     * If the file is not from the current workspace, returns empty string.
     * @param filePath string path of the file
     * @param rootUris string URIs of the root folders in the current workspace
     */
    private getRoot(filePath: string, rootUris: string[]): URI {
        const roots = rootUris.filter(root => new URI(root).withScheme('file').isEqualOrParent(FileUri.create(filePath).withScheme('file')));
        if (roots.length > 0) {
            return FileUri.create(FileUri.fsPath(roots.sort((r1, r2) => r2.length - r1.length)[0]));
        }
        return new URI();
    }

    // Cancel an ongoing search.  Trying to cancel a search that doesn't exist isn't an
    // error, otherwise we'd have to deal with race conditions, where a client cancels a
    // search that finishes normally at the same time.
    cancel(searchId: number): Promise<void> {
        const process = this.ongoingSearches.get(searchId);
        if (process) {
            process.kill();
            this.wrapUpSearch(searchId);
        }

        return Promise.resolve();
    }

    // Send onDone to the client and clean up what we know about search searchId.
    private wrapUpSearch(searchId: number, error?: string): void {
        if (this.ongoingSearches.delete(searchId)) {
            if (this.client) {
                this.logger.debug('Sending onDone for ' + searchId, error);
                this.client.onDone(searchId, error);
            } else {
                this.logger.debug('Wrapping up search ' + searchId + ' but no client');
            }
        } else {
            this.logger.debug("Trying to wrap up a search we don't know about " + searchId);
        }
    }

    dispose(): void {
    }
}
