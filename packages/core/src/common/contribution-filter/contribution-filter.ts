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

import { interfaces } from 'inversify';
import { Filter } from './filter';
import { NameBasedFilter } from './string-based-filter';
export type ContributionType = interfaces.ServiceIdentifier<unknown>;

export const ContributionFilter = Symbol('ContributionFilter');

/**
 * Specialized `Filter` that is used by the `ContainerBasedContributionProvider` to
 * filter unwanted contributions that are already bound in the DI container.
 */
export interface ContributionFilter extends Filter<Object> {
    /**
     * Contribution types for which this filter is applicable. If `undefined` or empty this filter
     * will be applied to all contribution types.
     */
    contributions?: ContributionType[];
}

/**
 * Specialized `ContributionFilter` that can be used to filter contributions based on their constructor name.
 */
export abstract class NameBasedContributionFilter extends NameBasedFilter<Object> implements ContributionFilter {
}
