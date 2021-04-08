/********************************************************************************
 * Copyright (C) 2021 STMicroelectronics and others.
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

/**
 * Utility function to test wether any of the given string patterns is included in the
 * tested string.
 * @param testStr String that should be tested
 * @param ignoreCase Flag, to indicate wether the test should be case-sensitive or not
 * @param patterns  The set of patterns that should be tested for inclusion
 * @returns `true` if any of the given patterns is included in the test string, `false` otherwise
 */
export function includes(testStr: string, ignoreCase: boolean, ...patterns: string[]): boolean {
    if (ignoreCase) {
        testStr = testStr.toLowerCase();
        patterns = patterns.map(pattern => pattern.toLowerCase());
    }
    return patterns.some(pattern => testStr.includes(pattern));
}

/**
 * Utility function to test wether any of the given string patterns is equal to the
 * tested string.
 * @param testStr String that should be tested
 * @param ignoreCase Flag, to indicate wether the test should be case-sensitive or not
 * @param patterns  The set of patterns that should be tested for equality
 * @returns `true` if any of the given patterns is equal to the test string, `false` otherwise
 */
export function equals(testStr: string, ignoreCase: boolean, ...patterns: string[]): boolean {
    if (ignoreCase) {
        testStr = testStr.toLowerCase();
        patterns = patterns.map(pattern => pattern.toLowerCase());
    }
    return patterns.some(pattern => testStr === pattern);

}

/**
 * Utility function to test wether a string matches any of the given regular expression patterns.
 * @param testStr String that should be tested
 * @param ignoreCase Flag, to indicate wether the test should be case-sensitive or not
 * @param patterns The set of regular expressions that should be matched
 * @returns `true` if the test string matches any of the given regular expressions, `false` otherwise
 */
export function matches(testStr: string, ignoreCase: boolean, ...patterns: (RegExp | string)[]): boolean {
    const flags = ignoreCase ? 'i' : undefined;
    return patterns.some(pattern => new RegExp(pattern, flags).test(testStr));
}
