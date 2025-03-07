import React, { useEffect } from 'react';
import { PageTitle, Link } from 'UI';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import withPageTitle from 'HOCs/withPageTitle';
import { withSiteId, alertCreate } from 'App/routes';

import AlertsList from './AlertsList';
import AlertsSearch from './AlertsSearch';
import {  useLocation } from 'react-router';
import { useStore } from 'App/mstore';

interface IAlertsView {
    siteId: string;
}

function AlertsView({ siteId }: IAlertsView) {
    const location = useLocation();
    const { alertsStore } = useStore();

    useEffect(() => {
        return () => {
            if (!location.pathname.includes('/alert')) {
                alertsStore.updateKey('page', 1);
            }
        }
      }, [location.pathname]);
    return (
        <div style={{ maxWidth: '1360px', margin: 'auto'}} className="bg-white rounded-lg shadow-sm py-4 border">
            <div className="flex items-center mb-4 justify-between px-6">
                <div className="flex items-baseline mr-3">
                    <PageTitle title="Alerts" />
                </div>
                <div className="ml-auto flex items-center">
                    <Link to={withSiteId(alertCreate(), siteId)}>
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />}>
                            Create Alert
                    </Button>

                    </Link>
                    <div className="ml-4 w-1/4" style={{ minWidth: 300 }}>
                        <AlertsSearch />
                    </div>
                </div>
            </div>
            <AlertsList siteId={siteId} />
        </div>
    );
}

export default withPageTitle('Alerts - OpenReplay')(AlertsView);
