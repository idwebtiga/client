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
  TabbarLink,
  Dialog,
  DialogButton
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

export default function Balance(props) {
  const { loginStatus, getTopupData, topupData, signer, balance, gasSymbol, coinSymbol,
    tokenSymbol, faucet, setShowBusy, createTopup
  } = useStore();

  const [activeSegmented, setActiveSegmented] = useState(1);
  const [show1, setShow1] = useState('list');
  const [amountTopup, setAmountTopup] = useState('');
  const [showConfirmTopup, setShowConfirmTopup] = useState(false);
  const [showHitApi, setShowHitApi] = useState(false);

  const doNewTopup = async () => {
    setShowConfirmTopup(false);
    setShowBusy(true);
    await createTopup(amountTopup);
    setShowBusy(false);
    setShow1('list');
  }

  let total = Number(amountTopup) + Number(topupData.fee);

  const confirmTopupView = (
    <div className='grid grid-cols-2 gap-2'>
      <div>{amountTopup} {coinSymbol}</div>
      <div className='text-right'>{amountTopup}</div>
      <div>Biaya penambangan</div>
      <div className='text-right'>{topupData.fee}</div>
      <div className='border-gray-500 border-t-4 col-span-2'></div>
      <div className=''>Total</div>
      <div className='text-right'>{total}</div>
    </div>
  );

  useEffect(() => {
    if (loginStatus === 'LOGGEDIN') {
      getTopupData();
    }
  }, [loginStatus]);

  const showNewTopup = () => {
    setShow1('new');
  }

  let content = null;

  if (activeSegmented === 1) {
    let list = <Block><div className='text-center'>Belum ada riwayat pengisian.</div></Block>;
    if (topupData.rows.length > 0) {
      list = (
        <List className='-m-4'>
          {topupData.rows.map(row => {
            let status = 'Menunggu pembayaran';
            if (row.paymentConfirmed) status = 'Pembayaran diterima';
            if (row.txConfirmed) status = 'Selesai';
            if (row.paymentCancelled) status = 'Batal';
            return (
              <ListItem
                link
                header={row.invoiceId}
                title={row.totalPayment}
                footer={status}
              />
            );
          })}
        </List>
      );
    }

    if (show1 === 'list') {
      content = (
        <Card className=''>
          <div className='flex justify-end'>
            <div>
              <Button onClick={showNewTopup}>Pengisian Baru</Button>
            </div>
          </div>
          {list}
        </Card>
      );
    } else if (show1 === 'new') {
      const enableBtnNewTopup = Number(amountTopup) > topupData.minimumTopup;
      content = (
        <Card className=''>
          <div className='flex justify-center'>
            Form Pengisian
          </div>
          <List margin='my-1'>
            <ListInput
              label={'Jumlah ' + coinSymbol + ' untuk diisi.'}
              type="number"
              value={amountTopup}
              onChange={e => setAmountTopup(e.target.value)}
            />
          </List>
          <Block margin='my-1'>
            <div className="grid grid-cols-2 gap-2">
              <div className='col-span-2'>
                Minimal pengisian: {topupData.minimumTopup} {coinSymbol}
              </div>
              <div>
                <Button outline onClick={() => setShow1('list')}>Kembali</Button>
              </div>
              <div>
                <Button disabled={!enableBtnNewTopup} onClick={() => setShowConfirmTopup(true)}>Pengisian Baru</Button>
              </div>
            </div>
          </Block>
        </Card>
      );
    }
  } else {

  }

  return (
    <div className='grid grid-cols-1 gap-2'>
      <Card className='flex flex-col'>
        <pre className='text-center'>
          Saldo {coinSymbol}<br />
          {wei2fiat(balance.coin)}<br />
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
      {content}

      <Dialog
        opened={showConfirmTopup}
        onBackdropClick={() => setShowConfirmTopup(false)}
        title="Pengisian"
        content={confirmTopupView}
        buttons={
          <>
            <DialogButton onClick={() => setShowConfirmTopup(false)}>
              Batal
            </DialogButton>
            <DialogButton strong onClick={doNewTopup}>
              Konfirmasi
            </DialogButton>
          </>
        }
      />
    </div>
  )
}