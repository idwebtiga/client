import { useEffect, useState } from 'react';
import {
  App as TheApp
} from 'konsta/react';
import { Route } from "wouter";
import { Toaster } from 'react-hot-toast';
import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { arbitrumSepolia, confluxESpaceTestnet } from '@reown/appkit/networks';
import { defineChain } from '@reown/appkit/networks';
import Loading from './Loading';
import Config from './Config';

const { CONFIG } = Config;

// 1. Get projectId
const projectId = CONFIG.projectId;

// 2. Set the networks
const networks = [confluxESpaceTestnet];

// 3. Create a metadata object - optional
const metadata = CONFIG.metadata;

// 4. Create a AppKit instance
createAppKit({
  adapters: [new EthersAdapter()],
  networks: networks,
  metadata,
  projectId,
  features: {
    email: false, // default to true
    socials: ['google'],
    emailShowWallets: true, // default to true
    analytics: false
  },
  allWallets: 'SHOW', // default to SHOW
})

export default function App() {

  return (
    <div className="bg-gray-500">
      <div className="md:container md:mx-auto md:max-w-[768px] min-h-screen bg-white">
        <TheApp safeAreas theme="material">
          <Loading />
          <Toaster />
        </TheApp >
      </div>
    </div>
  )
}