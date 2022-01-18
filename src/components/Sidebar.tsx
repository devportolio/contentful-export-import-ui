import React, {useEffect, useState} from 'react';
import { PlainClientAPI } from 'contentful-management';
import {Box, Button, Flex, Select} from '@contentful/f36-components';
import { SidebarExtensionSDK } from '@contentful/app-sdk';
import { CloudUploadIcon } from '@contentful/f36-icons';

const contentful = require('contentful-management')

interface SidebarProps {
  sdk: SidebarExtensionSDK;
  cma: PlainClientAPI;
}

const Sidebar = ({ sdk }: SidebarProps) => {
  // Set height
  sdk.window.updateHeight(100)

  const [loading, setLoading] = useState(false)
  const [spaceId, setSpaceId] = useState('')
  const [environmentId, setEnvironmentId] = useState('')
  const [spaces, setSpaces] = useState([])
  const [environments, setEnvironments] = useState([])

  const { space: currentSpaceId, environment: currentEnvironmentId, entry: entryId }: any = sdk.ids
  const {
    copyEndpoint,
    managementAccessToken: accessToken,
    defaultSpaceId,
    defaultEnvironmentId
  }: any = sdk.parameters.instance

  const getSpaces = async () => {
    const client = contentful.createClient({ accessToken })

    const { items } = await client.getSpaces()
    setSpaces(items)

    if (defaultSpaceId) {
      setSpaceId(defaultSpaceId)
      await setEnvironmentList(defaultSpaceId, items)
    }

    if (defaultEnvironmentId) {
      setEnvironmentId(defaultEnvironmentId)
    }
  }

  const handleSetSpace = async (e: any) => {
    const id = e.target.value
    setSpaceId(id)
    await setEnvironmentList(id, spaces)
  }

  const setEnvironmentList = async (id: string, list = []) => {
    const space: any = list.find((s: any) => s.sys.id === id)

    if (space) {
      const environments = await space.getEnvironments()
      setEnvironments(environments.items)
    } else {
      setEnvironments([])
      setEnvironmentId('')
    }
  }

  const performCopyData = () => {
    setLoading(true)

    const data = {
      import: {
        entryId,
        spaceId,
        environmentId,
        managementToken: accessToken,
      },

      export: {
        entryId,
        spaceId: currentSpaceId,
        environmentId: currentEnvironmentId,
        managementToken: accessToken,
      }
    }

    fetch(`${copyEndpoint}/copy-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data) // body data type must match "Content-Type" header
    })
        .then(response => response.json())
        .then(res => {
          setLoading(false)

          if (res) {
            sdk.notifier.success("Copy content successful!")
          } else {
            sdk.notifier.error("Something went wrong")
          }
        })
        .catch(error => {
          setLoading(false)
          sdk.notifier.error("Something went wrong")
        });
  }

  const getSpace: any = () => {
    return spaces.find((s: any) => s.sys.id === spaceId)
  }

  const hasDefault = () => !!defaultEnvironmentId && !!defaultSpaceId

  const showMessage = () => {
      sdk.dialogs.openConfirm({
        title: 'Confirm action',
        message: `Are you sure to copy the content to ${getSpace()?.name} (${environmentId})?`,
        intent: 'positive',
        confirmLabel: 'Yes',
        cancelLabel: 'No',
      }).then(res => {
        if (res) {
          performCopyData()
        }
      })
  }

  useEffect(() => {
    getSpaces()
  }, [])

  return <>
      <Flex justifyContent="space-between" style={{marginBottom:'10px'}}>
        <Box style={{width: '47%'}}>
          <Select
              id="spaceId"
              name="spaceId"
              value={spaceId}
              onChange={handleSetSpace}
              isDisabled={loading}
          >
            <Select.Option value="">Space</Select.Option>

            {spaces && spaces.filter((s: any) => s.sys.id !== currentSpaceId).map((s: any) =>
              <Select.Option value={s.sys.id} key={s.sys.id}>{s.name}</Select.Option>
            )}
          </Select>
        </Box>
        <Box style={{width: '47%'}}>
          <Select
              id="environmentId"
              name="environmentId"
              value={environmentId}
              onChange={(e) => setEnvironmentId(e.target.value)}
              isDisabled={loading}
          >
            <Select.Option value="">Environment</Select.Option>

            {environments && environments.map((e: any) =>
                <Select.Option value={e.sys.id} key={e.sys.id}>{e.name}</Select.Option>
            )}
          </Select>
        </Box>
      </Flex>
      <Button
          variant="secondary"
          onClick={showMessage}
          isFullWidth
          isLoading={loading}
          isDisabled={loading || !hasDefault()}
          endIcon={<CloudUploadIcon />}
      >
        Copy to
      </Button>
    </>


};

export default Sidebar;
