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

import { ThemingMain, ThemingExt, PLUGIN_RPC_CONTEXT } from '../common';
import { RPCProtocol } from '../common/rpc-protocol';
import { ColorTheme } from '../common/plugin-api-rpc-model';

export class ThemingExtImpl implements ThemingExt {

    private proxy: ThemingMain;

    constructor(rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.THEMING_MAIN);
    }

    $activeColorTheme(): ColorTheme {
        return this.proxy.$getActiveColorTheme();
    }

    getActiveColorTheme(): ColorTheme {
        return this.$activeColorTheme();
    }

}
