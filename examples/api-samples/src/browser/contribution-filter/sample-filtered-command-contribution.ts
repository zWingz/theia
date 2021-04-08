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
import { Command, CommandContribution, CommandRegistry, ContributionFilter } from '@theia/core/lib/common';
import { injectable, interfaces } from '@theia/core/shared/inversify';

export namespace SampleFilteredCommand {
    const EXAMPLE_CATEGORY = 'Examples';
    export const FILTERED: Command = {
        id: 'example_command.filtered',
        category: EXAMPLE_CATEGORY,
        label: 'This command should be filtered out'
    };
    export const FILTERED2: Command = {
        id: 'example_command.filtered2',
        category: EXAMPLE_CATEGORY,
        label: 'This command should be filtered out (2)'
    };
}

/**
 * This sample command is used to test the runtime filtering of already bound contributions.
 */
@injectable()
export class SampleFilteredCommandContribution implements CommandContribution {
    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(SampleFilteredCommand.FILTERED, { execute: () => { } });
    }
}

/**
 * Second sample command contribution that should be excluded.
 */
@injectable()
export class SampleFilteredCommandContribution2 implements CommandContribution {
    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(SampleFilteredCommand.FILTERED2, { execute: () => { } });
    }
}

@injectable()
export class SampleFilteredCommandContributionFilter implements ContributionFilter {

    contributions = [CommandContribution];

    test(contribution: Object): boolean {
        return contribution.constructor.name === 'SampleFilteredCommandContribution';
    }
}

@injectable()
export class SampleGenericContributionFilter implements ContributionFilter {

    contributions = ['*'];

    test(contribution: Object): boolean {
        return contribution.constructor.name.toLowerCase() === 'samplefilteredcommandcontribution2';
    }
}

export const bindSampleFilteredCommandContribution = (bind: interfaces.Bind) => {
    bind(CommandContribution).to(SampleFilteredCommandContribution);
    bind(CommandContribution).to(SampleFilteredCommandContribution2);
    bind(ContributionFilter).to(SampleFilteredCommandContributionFilter);
    bind(ContributionFilter).to(SampleGenericContributionFilter);
};
