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

import { injectable } from 'inversify';
import { Filter } from './filter';

/**
 * Specialized `Filter` class for filters based on string level. Test objects
 * are converted to a corresponding string representation with the help of the `toString()`-method
 * which enable to implement a `doTest()`-method based on string comparison.
 */
@injectable()
export abstract class StringBasedFilter<T extends Object> implements Filter<T> {

    /**
     * Converts the test object to a corresponding string representation
     * that is then used in the `doTest()` method.
     * @param toTest Test object that should be converted to string
     */
    abstract toString(toTest: T): string | undefined;

    /**
     * Tests whether the object should be filtered out based on its string representation.
     * @param testStr String representation of the test object
     * @returns `true` if the object should be filtered out, `false` otherwise
     */
    abstract doTest(testStr: string): boolean;

    test(contribution: T): boolean {
        const testStr = this.toString(contribution);
        if (typeof testStr !== 'string') {
            return false;
        }

        return this.doTest(testStr);
    }
}
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
    return patterns.find(pattern => testStr.includes(pattern)) !== undefined;
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
    return patterns.find(pattern => testStr === pattern) !== undefined;

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
    const regexps = patterns.map(pattern => new RegExp(pattern, flags));
    return regexps.find(regexp => regexp.test(testStr)) !== undefined;
}

/**
 * Specialized `StringBasedFilter` that can be used to filter objects based on their constructor name.
 */
@injectable()
export abstract class NameBasedFilter<T extends Object> extends StringBasedFilter<T> {
    toString(toTest: T): string {
        return toTest.constructor.name;
    }
}

