import React, {useEffect, useState} from 'react';
import { PlainClientAPI } from 'contentful-management';
import { Box, Button, Flex, Select, Text } from '@contentful/f36-components';
import { SidebarExtensionSDK } from '@contentful/app-sdk';
import { CloudUploadIcon } from '@contentful/f36-icons';
import { io } from "socket.io-client";

const contentful = require('contentful-management')

interface SidebarProps {
  sdk: SidebarExtensionSDK;
  cma: PlainClientAPI;
}

interface CopyData {
  total: number,
  processed: number
}

const Sidebar = ({ sdk }: SidebarProps) => {
  const [loading, setLoading] = useState(false)
  const [spaceId, setSpaceId] = useState('')
  const [environmentId, setEnvironmentId] = useState('')
  const [spaces, setSpaces] = useState([])
  const [environments, setEnvironments] = useState([])
  const [isCopying, setIsCopying] = useState(false)
  const [copyStatus, setCopyStatus] = useState({ done: true, date: null })
  const [isExporting, setIsExporting] = useState(false)
  const [count, setCount] = useState({ total: 0, processed: 0 })
  const [socket, setSocket] = useState(null)
  const [position, setPosition] = useState(0)

  const { space: currentSpaceId, environment: currentEnvironmentId, entry: entryId }: any = sdk.ids
  const {
    copyEndpoint,
    managementAccessToken: accessToken,
    defaultSpaceId,
    defaultEnvironmentId,
    showOption
  }: any = sdk.parameters.instance

  const initializeSocket = () => {
    const connection: any = io(copyEndpoint, { query: { entryId }})
    setSocket(connection)

    connection.on('copiedStatus'+entryId, (data: any) => {
      setCopyStatus(data)
    })

    connection.on('itemQueued'+entryId, (data: any) => {
      console.log(data)
      setPosition(data.position)
    })

    connection.on('copyIsDone'+entryId, (data: any) => {
      setCount({ total: 0, processed: 0 })
      setIsExporting(false)
      setIsCopying(false)
    })

    connection.on('processing'+entryId, (data: any) => {
      setCount({ total: 0, processed: 0 })
      setIsExporting(false)
      setIsCopying(false)
    })

    connection.on('exporting'+entryId, (count: CopyData) => {
      setIsExporting(true)
      setIsCopying(false)
      setCount(count)
      setLoading(true)
    })

    connection.on('exportDone'+entryId, () => {
      console.log('exportDone')
      setIsExporting(false)
      setIsCopying(true)
    })

    connection.on('importing'+entryId, (count: CopyData) => {
      console.log('importing')
      setIsExporting(false)
      setIsCopying(true)
      setLoading(true)
      setCount(count)
    })

    connection.on('importDone'+entryId, () => {
      console.log('importDone')
      setIsExporting(false)
      setIsCopying(false)
      setLoading(false)
      showResultMessage(true)
    })
  }

  const emit = (event: string, payload: any) => {
    if (!socket) {
      console.log('Socket is not ready')
      return;
    }

    // @ts-ignore
    socket.emit(event, payload)
  }

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

  const showResultMessage = (success: boolean) => {
    if (success) {
      sdk.notifier.success("Copy content successful!")
    } else {
      sdk.notifier.error("Something went wrong")
    }
  }

  const performCopyData = () => {
    setLoading(true)

    const data = {
      entryId,
      source: {
        spaceId: currentSpaceId,
        environmentId: currentEnvironmentId
      },
      destination: {
        spaceId,
        environmentId
      }
    }

    emit('copyEntry', data);
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

  const isNotReady = () => {
    return loading || !hasDefault() || isCopying||copyStatus.done
  }

  useEffect(() => {
    initializeSocket()
    getSpaces()
  }, [])

  // Set height
  sdk.window.updateHeight(showOption? 120: 100)
  return <>
    {showOption ?
      <Flex justifyContent="space-between" style={{marginBottom:'10px'}}>
        <Box style={{width: '47%'}}>
          <Select
              id="spaceId"
              name="spaceId"
              value={spaceId}
              onChange={handleSetSpace}
              isDisabled={isNotReady()}
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
              isDisabled={isNotReady()}
          >
            <Select.Option value="">Environment</Select.Option>

            {environments && environments.map((e: any) =>
                <Select.Option value={e.sys.id} key={e.sys.id}>{e.name}</Select.Option>
            )}
          </Select>
        </Box>
      </Flex>
      : <Flex justifyContent="space-between">
          <Box>
            <Text>Space: </Text>
            <Text fontWeight="fontWeightDemiBold">{getSpace() && getSpace().name}</Text>
          </Box>
          <Box>
            <Text>Environment: </Text>
            <Text fontWeight="fontWeightDemiBold">{environmentId}</Text>
          </Box>
        </Flex>
    }
      <Button
          style={{marginTop: '10px'}}
          variant="secondary"
          onClick={showMessage}
          isFullWidth
          isLoading={isNotReady()&&!copyStatus.done}
          isDisabled={isNotReady()}
          endIcon={<CloudUploadIcon />}
      >
        Copy to
      </Button>
    { isExporting &&
      <Flex justifyContent="space-between" style={{marginTop: '10px'}}>
        <Text>Exporting...</Text>
        <Text>{count.total} Entries</Text>
      </Flex>
    }
    { isCopying &&
      <Flex justifyContent="space-between" style={{marginTop: '10px'}}>
        <Text>Copying...</Text>
        <Text>{count.processed} of {count.total} Entries</Text>
      </Flex>
    }

    { position > 1 &&
      <Flex justifyContent="space-between" style={{marginTop: '10px'}}>
          <Text>Queued</Text>
          <Text>{position}</Text>
      </Flex>
    }
    { copyStatus.date &&
    <Flex justifyContent="space-between" style={{marginTop: '10px'}}>
        <Text>Date copied</Text>
        <Text>{copyStatus.date}</Text>
    </Flex>
    }
    </>


};

export default Sidebar;
