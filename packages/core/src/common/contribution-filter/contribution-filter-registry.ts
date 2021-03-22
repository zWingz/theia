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

const GENERIC_CONTRIBUTION_FILTER_KEY = '*';
@injectable()
export class ContributionFilterRegistry {
    registry: Map<ContributionType, ContributionFilter[]>;
    constructor(@multiInject(ContributionFilter) @optional() contributionFilters: ContributionFilter[] = []) {
        this.registry = new Map();
        contributionFilters.forEach(filter => {
            if (!filter.contributions || filter.contributions.length === 0) {
                this.addFilter(GENERIC_CONTRIBUTION_FILTER_KEY, filter);
            } else {
                filter.contributions.forEach(type => {
                    this.addFilter(type, filter);
                });
            }
        });
    }

    private addFilter(type: ContributionType, filter: ContributionFilter): void {
        this.getOrCreate(type).push(filter);
    }

    private getOrCreate(type: ContributionType): ContributionFilter[] {
        let value = this.registry.get(type);
        if (!value) {
            value = [];
            this.registry.set(type, value);
        }
        return value;
    }

    get(type: ContributionType): ContributionFilter[] {
        const filters = [...(this.registry.get(type) || [])];
        if (type !== GENERIC_CONTRIBUTION_FILTER_KEY) {
            filters.push(...(this.registry.get(GENERIC_CONTRIBUTION_FILTER_KEY) || []));
        }
        return filters;
    }

    /**
     * Applies the filters for the given contribution type. Generic filters will be applied on any given type.
     * @param toFilter the elements to filter
     * @param type the contribution type for which potentially filters were registered
     * @returns the filtered elements
     */
    applyFilters<T extends Object>(toFilter: T[], type: ContributionType): T[] {
        const filters = this.get(type);
        return applyFilters<T>(toFilter, filters);
    }
}
