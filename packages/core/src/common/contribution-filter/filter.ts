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

export const Filter = Symbol('Filter');
/**
 * A `Filter` can be used to test whether a given object should be filtered
 * from a set of objects. The `test` function can be applied to an object
 * of matching type and returns `true` if the object should be filtered out.
 */
export interface Filter<T extends Object> {
    /**
     * Evaluates this filter on the given argument.
     * @param toTest Object that should be tested
     * @returns `true` if the object should be filtered out, `false` otherwise
     */
    test(toTest: T): Boolean;
}

/**
 * Applies a set of filters to a set of given objects and returns the set of filtered objects.
 * @param toFilter Set of objects which should be filtered
 * @param filters Set of filters that should be applied
 * @param negate Negation flag. If set to true the result of all `Filter.test` methods is negated
 * @returns The set of filtered arguments
 */
export function applyFilters<T extends Object>(toFilter: T[], filters: Filter<T>[], negate: boolean = false): T[] {
    if (filters.length === 0) {
        return toFilter;
    }
    return toFilter.filter(object => {
        const result = filters.every(filter => !filter.test(object));
        return negate ? !result : result;
    });
}

