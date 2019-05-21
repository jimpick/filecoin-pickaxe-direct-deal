#!/usr/bin/env node

import meow from 'meow'
import React, { useState, useEffect } from 'react'
import { render, Box, Color } from 'ink'
import { groupStart, groupStop } from './group'
import { ConnectGroup } from './groupContext'
import useFilecoinConfig from '@jimpick/use-filecoin-config'
import useFilecoinHead from '@jimpick/use-filecoin-head'
import useFilecoinNetworkInfo from '@jimpick/use-filecoin-network-info'
import useFilecoinAsks from '@jimpick/use-filecoin-asks'
import InkWatchForExitKey from '@jimpick/ink-watch-for-exit-key'
import ShowBundle from './showBundle'
import Duration from './duration'
import Scrollable from './scrollable'
import AsksAndRequests from './asksAndRequests'

const cli = meow(
  `
    Usage
      $ filecoin-pickaxe-direct-deal [options]

    Options:

      --duration <blocks>
      -d <blocks>

        Deal duration in blocks (approx 30 seconds each)
  `,
  {
    flags: {
      duration: {
        alias: 'd',
        type: 'string'
      }
    }
  }
)

const args = cli.flags

const duration = Number(args.duration) || 2880

const Main = () => {
  const [nickname] = useFilecoinConfig('heartbeat.nickname')
  const [, height, updateTime] = useFilecoinHead({
    interval: 5000
  })
  const [netName, , netHeight] = useFilecoinNetworkInfo({
    interval: 30000
  })
  const [unfilteredAsks] = useFilecoinAsks()
  const asks = unfilteredAsks &&
    unfilteredAsks.filter(ask => ask.expiry > height + duration)

  const { columns, rows } = process.stdout

  if (!updateTime) {
    return <Box>Loading...</Box>
  }

  const seconds = (
    <Box>
      ({Math.floor((Date.now() - updateTime) / 1000)}s ago)
    </Box>
  )

  const netInfo = (
    <Box>
      {netName}: {netHeight >= 0 ? netHeight : 'Loading...'}
    </Box>
  )

  const content = <Scrollable
    height={rows - 5}
    dataLength={asks && asks.length}
    render={
      ({ height, scrollTop, cursorIndex }) => {
        return (
          <AsksAndRequests
            asks={asks}
            height={height}
            scrollTop={scrollTop}
            cursorIndex={cursorIndex} />
        )
      }
    } />

  return (
    <ConnectGroup>
      <Box flexDirection="column" width={columns} height={rows - 1}>
        <Box>
          <Box flexGrow={1}>
            <Color green>Filecoin Pickaxe Direct Deal</Color>
          </Box>
          <Box>
            {asks && `${asks.length} asks`}
          </Box>
        </Box>
        <ShowBundle />
        <Duration duration={duration} height={height} />
        {content}
        <Box>
          <Box>
            {nickname && nickname + ' '}
          </Box>
          <Box flexGrow={1}>
            {height} {seconds}
          </Box>
          <Box>
            <Box>{netInfo}</Box>
          </Box>
        </Box>
        <InkWatchForExitKey />
      </Box>
    </ConnectGroup>
  )
}

async function run () {
  await groupStart()

  const { rerender, waitUntilExit } = render(<Main/>)

  process.on('SIGWINCH', () => rerender(<Main/>))

  try {
    await waitUntilExit()
    process.exit(0)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}

run()