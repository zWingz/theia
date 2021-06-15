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

import { enableJSDOM } from '@theia/core/lib/browser/test/jsdom';

let disableJSDOM = enableJSDOM();

import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
import { ApplicationProps } from '@theia/application-package/lib/application-props';
FrontendApplicationConfigProvider.set({
    ...ApplicationProps.DEFAULT.frontend.config
});

import { expect } from 'chai';
import { EmptyPropertyViewWidgetProvider } from './empty-property-view-widget-provider';
import { Container } from '@theia/core/shared/inversify';
import { ContributionProvider } from '@theia/core/lib/common';
import { PropertyDataService } from './property-data-service';
import { PropertyViewWidget } from './property-view-widget';

disableJSDOM();

let emptyPropertyViewWidgetProvider: EmptyPropertyViewWidgetProvider;

describe('empty-property-view-widget-provider', function (): void {

    before(() => {
        disableJSDOM = enableJSDOM();
        const container = new Container();
        container.bind(EmptyPropertyViewWidgetProvider).toSelf().inSingletonScope();
        container.bind<Partial<ContributionProvider<PropertyDataService>>>(ContributionProvider)
            .toConstantValue({
                getContributions: () => [],
            })
            .whenTargetNamed(PropertyDataService);
        emptyPropertyViewWidgetProvider = container.get(EmptyPropertyViewWidgetProvider);
    });

    after(() => {
        disableJSDOM();
    });

    describe('#canHandle', () => {

        it('should handle `undefined` selections', () => {
            expect(emptyPropertyViewWidgetProvider.canHandle(undefined)).to.be.equal(1);
        });

        it('should not handle non-empty selections', () => {
            //  A real provider should handle actual object selections.
            expect(emptyPropertyViewWidgetProvider.canHandle({})).to.be.equal(0);
        });

    });

    describe('#provideWidget', () => {

        it('should provide widget with a selection', async () => {
            const widget = await emptyPropertyViewWidgetProvider.provideWidget({});
            expect(is(widget)).equal(true);
        });

        it('should provide widget with a selection', async () => {
            const widget = await emptyPropertyViewWidgetProvider.provideWidget(undefined);
            expect(is(widget)).equal(true);
        });

    });

});

function is(arg: Object | undefined): arg is PropertyViewWidget {
    return !!arg && 'updatePropertyViewContent' in arg;
}
