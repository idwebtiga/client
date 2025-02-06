import { useEffect, useState } from 'react';
import {
  Page, Button, Block,
  Preloader
} from 'konsta/react';

import {
  useAppKit,
  useAppKitState,
  useAppKitTheme,
  useAppKitEvents,
  useWalletInfo,
  useAppKitAccount
} from '@reown/appkit/react';
import { useAppKitProvider, useAppKitNetworkCore } from '@reown/appkit/react';

// import { socket } from './socket';
import Wallet from './Wallet';
import store from './store/store';
import Lib from './Lib';
import Config from './Config';
import { GrAchievement } from "react-icons/gr";

const { useStore } = store;
const { CONFIG } = Config;

export default function Loading(props) {
  const [busy, setBusy] = useState(true);
  const { address, caipAddress, isConnected, status } = useAppKitAccount();
  const { chainId } = useAppKitNetworkCore();
  const { walletProvider } = useAppKitProvider('eip155');
  const { open } = useAppKit();
  const { loginStatus, loginSigner, loginByToken, loginBySiwe, logout } = useStore();

  const goodConnection = isConnected && chainId === CONFIG.chainId;

  console.log({ isConnected, status, chainId, loginStatus, caipAddress });

  useEffect(() => {
    if (goodConnection) {
      const init = async () => {
        setBusy(true);
        await loginSigner(walletProvider, chainId, address);
        await loginByToken();
        setBusy(false);
      }

      console.log('goodConnection: init...');
      init();
    } else {
      logout();
      setBusy(false);
    }
  }, [isConnected]);

  const enterApp = () => {
    if (loginStatus === 'DISCONNECTED') {
      open();
    } else if (loginStatus === 'CONNECTED') {
      const reLogin = async () => {
        setBusy(true);
        const ok = await loginByToken();
        if (!ok) await loginBySiwe();
        setBusy(false);
      }
      reLogin();
    }
  }

  if (loginStatus === 'LOGGEDIN') return <Wallet />;

  return (
    <Page>
      <Block margin='my-1'>
        <div className='grid grid-cols-1 gap-2'>
          <pre className='flex flex-col justify-center items-center py-8'>
            <GrAchievement size={128} />
            <div className='text-3xl mt-8'>WEB3 APP</div>
            <div>To the moon !!</div>
          </pre>
          <div className='flex justify-center items-center'>
            {busy ? <Preloader /> : <Button onClick={() => enterApp()}>Masuk</Button>}
          </div>
        </div>
      </Block>
    </Page>
  )
}
