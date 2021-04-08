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

import { injectable, multiInject, optional } from 'inversify';
import { ContributionFilter, ContributionType } from './contribution-filter';
import { applyFilters } from './filter';

@injectable()
export class ContributionFilterRegistry {

    protected registry = new Map<ContributionType, ContributionFilter[]>();
    protected genericFilters: ContributionFilter[] = [];

    constructor(
        @multiInject(ContributionFilter) @optional() contributionFilters: ContributionFilter[] = []
    ) {
        for (const filter of contributionFilters) {
            if (filter.contributions === undefined || filter.contributions.length === 0 || filter.contributions.includes('*')) {
                this.genericFilters.push(filter);
            } else {
                for (const type of filter.contributions) {
                    this.addFilter(type, filter);
                }
            }
        }
    }

    get(type: ContributionType): ContributionFilter[] {
        return [
            ...this.registry.get(type) || [],
            ...this.genericFilters
        ];
    }

    /**
     * Applies the filters for the given contribution type. Generic filters will be applied on any given type.
     * @param toFilter the elements to filter
     * @param type the contribution type for which potentially filters were registered
     * @returns the filtered elements
     */
    applyFilters<T extends Object>(toFilter: T[], type: ContributionType): T[] {
        return applyFilters<T>(toFilter, this.get(type));
    }

    protected addFilter(type: ContributionType, filter: ContributionFilter): void {
        this.getOrCreate(type).push(filter);
    }

    protected getOrCreate(type: ContributionType): ContributionFilter[] {
        let value = this.registry.get(type);
        if (value === undefined) {
            this.registry.set(type, value = []);
        }
        return value;
    }
}
