import { useEffect, useState } from 'react';
import {
  App,
  Page,
  Navbar,
  Block,
  Button,
  Card,
  List,
  ListItem,
  ListInput,
  Link,
  BlockTitle,
  ListButton,
  NavbarBackLink,
  Segmented,
  SegmentedButton,
  Radio,
  Preloader,
  Tabbar,
  TabbarLink
} from 'konsta/react';
import {
  useAppKit,
  useAppKitState,
  useAppKitTheme,
  useAppKitEvents,
  useWalletInfo,
  useAppKitAccount
} from '@reown/appkit/react';
import { useLocation, Route, Switch } from "wouter";
import { BrowserProvider, JsonRpcSigner, formatEther, parseUnits, Contract, parseEther } from 'ethers';
import toast, { Toaster } from 'react-hot-toast';
import store from './store/store';
import Lib from './Lib';
import Stake from './Stake';
import Swap from './Swap';

const { useStore } = store;
const { e9, e18, CONFIG, bigIntReplacer, wei2fiat } = Lib;

export default function Wallet(props) {
  const { loginStatus, signer, balance, gasSymbol, coinSymbol, tokenSymbol, faucet
  } = useStore();
  const { open } = useAppKit();
  const [, setLocation] = useLocation();
  const ok = loginStatus === 'LOGGEDIN';
  const [activeTab, setActiveTab] = useState('tab-1');
  const [activeSegmented, setActiveSegmented] = useState(1);

  let content;
  if (activeTab === 'tab-1') {
    content = (
      <div className='grid grid-cols-1 gap-2'>
        <Card className='flex flex-col'>
          <pre className='text-center'>
            Saldo RP<br />
            50.000<br />
            &nbsp;
          </pre>
          <div className='flex'>
            <Segmented outline>
              <SegmentedButton
                active={activeSegmented === 1}
                onClick={() => setActiveSegmented(1)}
              >
                Pengisian
              </SegmentedButton>
              <SegmentedButton
                active={activeSegmented === 2}
                onClick={() => setActiveSegmented(2)}
              >
                Penarikan
              </SegmentedButton>
            </Segmented>
          </div>
        </Card>
        <Card className=''>
          <div className='flex justify-end'>
            <div>
              <Button onClick={() => console.log('!')}>Pengisian Baru</Button>
            </div>
          </div>
          <List className='-m-4'>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5].map(row => {
              return (
                <ListItem
                  link
                  header="INV/25/12/02/212"
                  title="500.000 RP"
                  footer="Cancelled"
                />
              );
            })}
          </List>
        </Card>
      </div>
    );
  } else if (activeTab === 'tab-2') {
    content = (
      <div>
        <Swap />
      </div>
    );
  } else if (activeTab === 'tab-3') {
    content = (
      <div>
        <Stake />
      </div>
    );
  }

  const navbarInfo = () => {
    return (
      <div className='m-4'>
        <div className='flex flex-row'>
          <div className='flex-1 mr-4 truncate'>
            <span className='text-xs truncate'>{signer ? signer.address : ''}</span>
            <div className='text-wrap'>
              {wei2fiat(balance.coin)} {coinSymbol} | {wei2fiat(balance.token)} {tokenSymbol}
            </div>
          </div>
          <div className='w-3/12'><Button onClick={() => open()}>Koneksi</Button></div>
        </div>
      </div>
    );
  }

  return (
    <Page className=''>
      <div className='flex flex-col h-screen'>
        <div className='bg-blue-300'>
          {navbarInfo()}
        </div>
        <div className='flex-1 overflow-y-auto'>
          {content}
        </div>
        <div>
          <Tabbar
            labels={true}
            className=""
          >
            <TabbarLink
              active={activeTab === 'tab-1'}
              onClick={() => setActiveTab('tab-1')}
              label={'Saldo'}
            />
            <TabbarLink
              active={activeTab === 'tab-2'}
              onClick={() => setActiveTab('tab-2')}
              label={'Jual/Beli'}
            />
            <TabbarLink
              active={activeTab === 'tab-3'}
              onClick={() => setActiveTab('tab-3')}
              label={'Pinjaman'}
            />
          </Tabbar>
        </div>
      </div>
    </Page >
  )
}