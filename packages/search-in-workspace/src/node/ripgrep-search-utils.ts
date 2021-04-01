/********************************************************************************
 * Copyright (C) 2021 Ericsson and others.
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

import * as fs from '@theia/core/shared/fs-extra';
import * as path from 'path';

export namespace RipgrepSearchUtils {
    /**
     * Attempts to resolve valid file paths from a given list of patterns.
     * The given search paths are used to try resolving relative path patterns to an absolute path.
     * The resulting object will include two sets.
     *
     * The first set includes all the patterns that were successfully converted to at least one file existing
     * in the file system.
     *
     * The second set includes all validated paths derived from joining search paths with patterns.
     */
    export function resolvePatternsToPaths(patterns: string[], searchPaths: string[]): { convertedPatterns: Set<string>, resolvedPaths: Set<string> } {
        const convertedPatterns = new Set<string>();
        const resolvedPaths = new Set<string>();

        patterns.forEach(pattern => {
            searchPaths.forEach(root => {
                const foundPath = resolveFolderFromGlob(root, pattern);

                if (foundPath) {
                    convertedPatterns.add(pattern);
                    resolvedPaths.add(foundPath);
                }
            });
        });

        return { convertedPatterns, resolvedPaths };
    }

    /**
     * Transforms relative patterns to absolute paths, one for each given search path.
     * The resulting paths are not validated in the file system as the pattern keeps glob information.
     *
     * @returns The resulting list may be larger than the received patterns as a relative pattern may
     * resolve to multiple absolute patterns upto the number of search paths.
     */
     export function replaceRelativeToAbsolute(patterns: string[], searchPaths: string[]): string[] {
        const processedPatterns = new Set<string>();

        patterns.forEach(pattern => {
            searchPaths.forEach(root => {
                processedPatterns.add(relativeToAbsolutePattern(root, pattern));
            });
        });

        return Array.from(processedPatterns);
    }

    /**
     * Joins the given root and pattern to form an absolute path
     * as long as the pattern is in relative form.
     * E.g. './foo' becomes '${root}/foo'
     */
    function relativeToAbsolutePattern(root: string, pattern: string): string {
        if (!isRelativeToBaseDirectory(pattern)) {
            // No need to convert to absolute
            return pattern;
        }
        return path.join(root, pattern);
    }

    /**
     * Checks if the format of a given path represents a relative path within the base directory
     */
    function isRelativeToBaseDirectory(filePath: string): boolean {
        return filePath.replace(/\\/g, '/').startsWith('./');
    }

    /**
     * Attempts to build a valid absolute file or directory from the given pattern and root folder.
     * e.g. /a/b/c/foo/** to /a/b/c/foo, or './foo/**' to '${root}/foo'.
     *
     * @returns the valid path if found existing in the file system.
     */
    function resolveFolderFromGlob(root: string, pattern: string): string | undefined {
        const patternBase = stripGlobSuffix(pattern);

        if (!path.isAbsolute(patternBase) && !isRelativeToBaseDirectory(patternBase)) {
            // The pattern is not referring to a single file or folder, i.e. not to be converted
            return undefined;
        }

        const targetPath = path.isAbsolute(patternBase) ? patternBase : path.join(root, patternBase);

        if (fs.existsSync(targetPath)) {
            return targetPath;
        }

        return undefined;
    }

    /**
     * Removes a glob suffix from a given pattern (e.g. /a/b/c/**)
     * to a directory path (/a/b/c).
     *
     * @returns the path without the glob suffix,
     * else returns the original pattern.
     */
    function stripGlobSuffix(pattern: string): string {
        const pathParsed = path.parse(pattern);
        const suffix = pathParsed.base;

        return suffix === '**' ? pathParsed.dir : pattern;
    }
}
