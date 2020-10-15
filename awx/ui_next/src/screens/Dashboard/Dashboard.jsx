import React, { Fragment, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import {
  Card,
  CardHeader,
  CardHeaderMain,
  CardActions,
  CardBody,
  PageSection,
  PageSectionVariants,
  Select,
  SelectVariant,
  SelectOption,
  Tabs,
  Tab,
  TabTitleText,
  Text,
  TextContent,
  TextVariants,
  Title,
} from '@patternfly/react-core';

import useRequest from '../../util/useRequest';
import { DashboardAPI } from '../../api';
import JobList from '../../components/JobList';

import LineChart from './shared/LineChart';
import Count from './shared/Count';
import DashboardTemplateList from './shared/DashboardTemplateList';

const Counts = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-gap: var(--pf-global--spacer--lg);
  margin-bottom: var(--pf-global--spacer--lg);

  @media (max-width: 900px) {
    grid-template-columns: repeat(3, 1fr);
    grid-auto-rows: 1fr;
  }
`;

const ListPageSection = styled(PageSection)`
  padding-top: 0;
  padding-bottom: 0;
  min-height: 626px;

  & .spacer {
    margin-bottom: var(--pf-global--spacer--lg);
  }
`;

function Dashboard({ i18n }) {
  const { light } = PageSectionVariants;

  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const [isJobTypeDropdownOpen, setIsJobTypeDropdownOpen] = useState(false);
  const [periodSelection, setPeriodSelection] = useState('month');
  const [jobTypeSelection, setJobTypeSelection] = useState('all');
  const [activeTabId, setActiveTabId] = useState(0);

  const {
    result: { jobGraphData, countData },
    request: fetchDashboardGraph,
  } = useRequest(
    useCallback(async () => {
      const [{ data }, { data: dataFromCount }] = await Promise.all([
        DashboardAPI.readJobGraph({
          period: periodSelection,
          job_type: jobTypeSelection,
        }),
        DashboardAPI.read(),
      ]);
      const newData = {};
      data.jobs.successful.forEach(([dateSecs, count]) => {
        if (!newData[dateSecs]) {
          newData[dateSecs] = {};
        }
        newData[dateSecs].successful = count;
      });
      data.jobs.failed.forEach(([dateSecs, count]) => {
        if (!newData[dateSecs]) {
          newData[dateSecs] = {};
        }
        newData[dateSecs].failed = count;
      });
      const jobData = Object.keys(newData).map(dateSecs => {
        const [created] = new Date(dateSecs * 1000).toISOString().split('T');
        newData[dateSecs].created = created;
        return newData[dateSecs];
      });
      return {
        jobGraphData: jobData,
        countData: dataFromCount,
      };
    }, [periodSelection, jobTypeSelection]),
    {
      jobGraphData: [],
      countData: {},
    }
  );

  useEffect(() => {
    fetchDashboardGraph();
  }, [fetchDashboardGraph, periodSelection, jobTypeSelection]);

  return (
    <Fragment>
      <PageSection variant={light} className="pf-m-condensed">
        <Title size="2xl" headingLevel="h2">
          {i18n._(t`Dashboard`)}
        </Title>
      </PageSection>
      <PageSection>
        <Counts>
          <Count
            link="/hosts"
            data={countData?.hosts?.total}
            label={i18n._(t`Hosts`)}
          />
          <Count
            failed
            link="/hosts?host.last_job_host_summary__failed=true"
            data={countData?.hosts?.failed}
            label={i18n._(t`Failed hosts`)}
          />
          <Count
            link="/inventories"
            data={countData?.inventories?.total}
            label={i18n._(t`Inventories`)}
          />
          <Count
            failed
            link="/inventories?inventory.inventory_sources_with_failures__gt=0"
            data={countData?.inventories?.failed}
            label={i18n._(t`Inventory sync failures`)}
          />
          <Count
            link="/projects"
            data={countData?.projects?.total}
            label={i18n._(t`Projects`)}
          />
          <Count
            failed
            link="/projects?project.status__in=failed,canceled"
            data={countData?.projects?.failed}
            label={i18n._(t`Project sync failures`)}
          />
        </Counts>
        <Card>
          <CardHeader>
            <CardHeaderMain>
              <TextContent>
                <Text component={TextVariants.h3}>{i18n._(t`Job Status`)}</Text>
              </TextContent>
            </CardHeaderMain>
            <CardActions>
              <Select
                variant={SelectVariant.single}
                placeholderText={i18n._(t`Select period`)}
                aria-label={i18n._(t`Select period`)}
                className="periodSelect"
                onToggle={setIsPeriodDropdownOpen}
                onSelect={(event, selection) => setPeriodSelection(selection)}
                selections={periodSelection}
                isOpen={isPeriodDropdownOpen}
              >
                <SelectOption key="month" value="month">
                  {i18n._(t`Past month`)}
                </SelectOption>
                <SelectOption key="two_weeks" value="two_weeks">
                  {i18n._(t`Past two weeks`)}
                </SelectOption>
                <SelectOption key="week" value="week">
                  {i18n._(t`Past week`)}
                </SelectOption>
              </Select>
              <Select
                variant={SelectVariant.single}
                placeholderText={i18n._(t`Select job type`)}
                aria-label={i18n._(t`Select job type`)}
                className="jobTypeSelect"
                onToggle={setIsJobTypeDropdownOpen}
                onSelect={(event, selection) => setJobTypeSelection(selection)}
                selections={jobTypeSelection}
                isOpen={isJobTypeDropdownOpen}
              >
                <SelectOption key="all" value="all">
                  {i18n._(t`All job types`)}
                </SelectOption>
                <SelectOption key="inv_sync" value="inv_sync">
                  {i18n._(t`Inventory sync`)}
                </SelectOption>
                <SelectOption key="scm_update" value="scm_update">
                  {i18n._(t`SCM update`)}
                </SelectOption>
                <SelectOption key="playbook_run" value="playbook_run">
                  {i18n._(t`Playbook run`)}
                </SelectOption>
              </Select>
            </CardActions>
          </CardHeader>
          <CardBody>
            <LineChart
              height={430}
              id="d3-line-chart-root"
              data={jobGraphData}
            />
          </CardBody>
        </Card>
      </PageSection>
      <ListPageSection>
        <div className="spacer">
          <Card>
            <Tabs
              aria-label={i18n._(t`Tabs`)}
              activeKey={activeTabId}
              onSelect={(key, eventKey) => setActiveTabId(eventKey)}
            >
              <Tab
                aria-label={i18n._(t`Recent Jobs list tab`)}
                eventKey={0}
                title={<TabTitleText>{i18n._(t`Recent Jobs`)}</TabTitleText>}
              />
              <Tab
                aria-label={i18n._(t`Recent Templates list tab`)}
                eventKey={1}
                title={
                  <TabTitleText>{i18n._(t`Recent Templates`)}</TabTitleText>
                }
              />
            </Tabs>
            {activeTabId === 0 && <JobList defaultParams={{ page_size: 5 }} />}
            {activeTabId === 1 && <DashboardTemplateList />}
          </Card>
        </div>
      </ListPageSection>
    </Fragment>
  );
}

export default withI18n()(Dashboard);
