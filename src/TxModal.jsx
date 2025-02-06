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
  Preloader
} from 'konsta/react';
import { useLocation } from "wouter";
import { BrowserProvider, JsonRpcSigner, formatEther, parseUnits, Contract, parseEther } from 'ethers';
import toast, { Toaster } from 'react-hot-toast';
import store from './store/store';
import Lib from './Lib';

const { useStore } = store;
const { e9, e18, CONFIG, bigIntReplacer, wei2fiat } = Lib;

export default function TxModal(props) {
  const { signer, contracts, balance, gasSymbol, coinSymbol, tokenSymbol,
    txInfo,
    setTxModalHidden
  } = useStore();

  let status = 'Loading'; // SUCCESS, ERROR
  if (txInfo.result === 'SUCCESS') status = 'Confirmed';
  else if (txInfo.result === 'ERROR') status = 'Failed';

  const urlExplorer = txInfo.txHash ? 'explorer://' + txInfo.txHash : false;
  const processing = txInfo.status !== 'STOP';

  return (
    <div>
      <Block margin='my-1'>
        <pre className='truncate'>
          Tx Status: {status}
        </pre>

      </Block>
      <Block margin='my-1'>
        <div className="grid grid-cols-1 gap-2">
          <Button onClick={() => console.log('explorer')} disabled={!urlExplorer}>Explorer</Button>
          <Button onClick={setTxModalHidden} disabled={processing}>Close</Button>
        </div>
      </Block>
    </div>
  )
}