/*
 * Copyright 2020 RoadieHQ
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React, { FC, useContext, useEffect, useState } from 'react';
import { Typography, Box, Button } from '@material-ui/core';
import GitHubIcon from '@material-ui/icons/GitHub';
import { Table, TableColumn } from '@backstage/core';
import { Entity } from '@backstage/catalog-model';
import moment from 'moment';
import { useLambda } from '../../hooks/useLambda';
import { LambdaData } from '../../types';
import { Settings } from '../Settings';
import { AppContext, useSettings } from '../../state';
import { useServiceEntityAnnotations } from '../../hooks/useServiceEntityAnnotations';
import SimpleBanner from '../SimpleBanner';
import { SettingsComponent } from '../Settings/SettingsButton';

const getElapsedTime = (start: string) => {
  return moment(start).fromNow();
};

const generatedColumns: TableColumn[] = [
  {
    title: 'Function Name',
    field: 'functionName',
    width: '300px',
    render: (row: Partial<LambdaData>) => {
      const href = `https://console.aws.amazon.com/lambda/home?region=${row.region}#/functions/${row.functionName}`;
      return (
        <Box fontWeight="fontWeightBold">
          <a target="_blank" href={href}>
            {row.functionName}
          </a>
        </Box>
      );
    },
  },
  {
    title: 'Description',
    field: 'description',
    highlight: true,
    render: (row: Partial<LambdaData>) => (
      <Typography variant="body2" noWrap>
        {row.description}
      </Typography>
    ),
  },
  {
    title: 'Last modified',
    field: 'lastModifiedDate',
    width: '250px',
    render: (row: Partial<LambdaData>) => (
      <Typography variant="body2" noWrap>
        {getElapsedTime(row.lastModifiedDate!)}
      </Typography>
    ),
  },
  {
    title: 'Runtime',
    field: 'runtime',
    highlight: true,
    render: (row: Partial<LambdaData>) => (
      <Typography variant="body2" noWrap>
        {row.runtime}
      </Typography>
    ),
  },
  {
    title: 'Size',
    field: 'codeSize',
    highlight: true,
    render: (row: Partial<LambdaData>) => (
      <Typography variant="body2" noWrap>
        {row?.codeSize ? (Math.round(row.codeSize / 100) * 100) / 1000 : 0} MB
      </Typography>
    ),
  },
  {
    title: 'Memory',
    field: 'memory',
    highlight: true,
    render: (row: Partial<LambdaData>) => (
      <Typography variant="body2" noWrap>
        {row.memory} MB
      </Typography>
    ),
  },
  {
    title: 'Logs',
    field: '',
    highlight: true,
    render: (row: Partial<LambdaData>) => {
      const href = `https://${row.region}.console.aws.amazon.com/cloudwatch/home?region=${row.region}#logStream:group=%252Faws%252Flambda%252F${row.functionName}`;

      return (
        <a href={href} target="_blank">
          <Button>Logs</Button>
        </a>
      );
    },
  },
];

type Props = {
  loading: boolean;
  projectName: string;
  retry: () => void;
  page: number;
  lambdaData?: LambdaData[];
  onChangePage: (page: number) => void;
  total: number;
  pageSize: number;
  onChangePageSize: (pageSize: number) => void;
};

export const AWSLambdaTableView: FC<Props> = ({
  projectName,
  loading,
  pageSize,
  page,
  lambdaData,
  onChangePage,
  onChangePageSize,
  total,
}) => {
  return (
    <Table
      isLoading={loading}
      options={{
        paging: true,
        pageSize,

        padding: 'dense',
        paginationType: 'normal',
      }}
      totalCount={total}
      page={page}
      data={lambdaData ?? []}
      onChangePage={onChangePage}
      onChangeRowsPerPage={onChangePageSize}
      title={
        <>
          <Box display="flex" alignItems="center">
            <GitHubIcon />
            <Box mr={1} />
            <Typography variant="h6">{projectName}</Typography>
            <SettingsComponent />
          </Box>
        </>
      }
      columns={generatedColumns}
    />
  );
};

export const AWSLambdaPageTable = ({ entity }: { entity: Entity }) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [filteredRows, setFilteredRows] = useState<LambdaData[]>([]);

  const {
    lambdaNames: lambdaAnnotationList,
    value: projectName,
    loading,
  } = useServiceEntityAnnotations(entity);

  const [
    {
      awsAccessKeyId,
      awsAccessKeySecret,
      authMethod,
      identityPoolId,
      region,
      showSettings,
    },
    dispatch,
  ] = useContext(AppContext);

  useSettings(projectName || '');

  const [tableProps] = useLambda({
    isLoading: loading,
    awsAccessKeyId: awsAccessKeyId,
    awsAccessKeySecret: awsAccessKeySecret,
    authMethod: authMethod,
    identityPoolId: identityPoolId,
    region: region,
  });

  useEffect(() => {
    tableProps.retry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityPoolId, region, authMethod, awsAccessKeyId, awsAccessKeySecret]);

  useEffect(() => {
    const filtered =
      tableProps.lambdaData
        ?.filter(v =>
          lambdaAnnotationList?.length
            ? lambdaAnnotationList[0] === 'all' ||
              lambdaAnnotationList.includes(v.functionName)
            : true,
        )
        .slice(page * pageSize, (page + 1) * pageSize) ?? [];
    if (filteredRows.length !== filtered.length) {
      setFilteredRows(filtered);
    }
  }, [tableProps.lambdaData, page, pageSize, lambdaAnnotationList]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <SimpleBanner
        onButtonClick={() => dispatch({ type: 'showSettings' })}
        isVisible={
          (!loading && !region) ||
          (!identityPoolId && authMethod === 'google') ||
          ((!awsAccessKeyId || !awsAccessKeySecret) && authMethod === 'aws')
        }
      />

      {showSettings && <Settings repoName={projectName!} />}
      <AWSLambdaTableView
        {...tableProps}
        projectName={projectName!}
        lambdaData={filteredRows}
        page={page}
        total={tableProps.lambdaData?.length ?? 0}
        pageSize={pageSize}
        loading={tableProps.loading || tableProps.loading}
        retry={tableProps.retry}
        onChangePageSize={setPageSize}
        onChangePage={setPage}
      />
    </>
  );
};
