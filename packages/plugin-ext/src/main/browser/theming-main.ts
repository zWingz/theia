/********************************************************************************
 * Copyright (C) 2020 Ericsson and others.
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
import { MAIN_RPC_CONTEXT, ThemingExt, ThemingMain } from '../../common/plugin-api-rpc';
import { RPCProtocol } from '../../common/rpc-protocol';
import { ColorTheme, ColorThemeKind } from '../../common/plugin-api-rpc-model';
import { ThemeService, ThemeType } from '@theia/core/lib/browser/theming';

export class ThemingMainImpl implements ThemingMain {

    private readonly proxy: ThemingExt;

    constructor(rpc: RPCProtocol, container: interfaces.Container) {
        this.proxy = rpc.getProxy(MAIN_RPC_CONTEXT.THEMING_EXT);
        console.log(`proxy: ${this.proxy}`);
    }

    $getActiveColorTheme(): ColorTheme {
        const theme = ThemeService.get().getCurrentTheme();
        return {
            kind: this.getColorThemeKind(theme.type)
        };
    }

    protected getColorThemeKind(type: ThemeType): ColorThemeKind {
        let kind: ColorThemeKind;
        switch (type) {
            case 'light':
                kind = ColorThemeKind.Light;
                break;
            case 'dark':
                kind = ColorThemeKind.Dark;
                break;
            case 'hc':
                kind = ColorThemeKind.HighContrast;
                break;
        }
        return kind;
    }

}
