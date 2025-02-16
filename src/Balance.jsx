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
    tokenSymbol, faucet, setShowBusy, createTopup, getPaymentData, delegatorFee
  } = useStore();

  const [activeSegmented, setActiveSegmented] = useState(1);
  const [show1, setShow1] = useState('list');
  const [amountTopup, setAmountTopup] = useState('');
  const [showConfirmTopup, setShowConfirmTopup] = useState(false);
  const [showConfirmPayment, setShowConfirmPayment] = useState(false);
  const [selectedItem, setSelectedItem] = useState(false);
  const [phoneNum, setPhoneNum] = useState('');

  const doNewTopup = async () => {
    setShowConfirmTopup(false);
    setShowBusy(true);
    await createTopup(amountTopup);
    setShowBusy(false);
    setShow1('list');
  }

  const tc = {
    amount: amountTopup,
    fee: delegatorFee,
    total: Number(amountTopup) + Number(delegatorFee)
  }

  const confirmTopupView = (
    <div className='grid grid-cols-2 gap-2'>
      <div>{tc.amount} {coinSymbol}</div>
      <div className='text-right'>{tc.amount}</div>
      <div>Biaya penambangan</div>
      <div className='text-right'>{tc.fee}</div>
      <div className='border-gray-500 border-t-4 col-span-2'></div>
      <div className=''>Total</div>
      <div className='text-right'>{tc.total}</div>
    </div>
  );

  // todo
  const pc = {
    nameItem: 'ITEM',
    amount: 0,
    fee: 0,
    total: 0
  };

  const confirmPaymentView = (
    <div className='grid grid-cols-2 gap-2'>
      <div className='col-span-2 font-bold'>{pc.nameItem}</div>
      <div>Harga item</div>
      <div className='text-right'>{pc.amount} {coinSymbol}</div>
      <div>Biaya penambangan</div>
      <div className='text-right'>{pc.fee} {coinSymbol}</div>
      <div className='border-gray-500 border-t-4 col-span-2'></div>
      <div className=''>Total</div>
      <div className='text-right'>{pc.total}</div>
    </div>
  );

  useEffect(() => {
    if (loginStatus === 'LOGGEDIN') {
      if (activeSegmented === 1) {
        getTopupData();
      } else if (activeSegmented === 2) {
        getPaymentData();
      }
    }
  }, [loginStatus, activeSegmented]);

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
            if (row.confirmed) status = 'Pembayaran diterima';
            if (row.minted) status = 'Selesai';
            if (row.cancelled) status = 'Batal';
            return (
              <ListItem
                key={row.invoiceId}
                link
                header={row.invoiceId}
                title={row.total}
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
      const enableBtnNewTopup = Number(amountTopup) >= topupData.minimumTopup;
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
  } else if (activeSegmented === 2) {
    // todo
    const price = 'todo';
    const enableBtnNewPayment = true;

    content = (
      <Card className=''>
        <div className='flex justify-center'>
          Form Belanja
        </div>
        <List margin='my-1'>
          <ListInput
            label={'Nomor Tujuan'}
            type="tel"
            placeholder="Misal (0813...)"
            value={phoneNum}
            onChange={e => setPhoneNum(e.target.value)}
          />
          <ListInput
            label="Saldo"
            type="select"
            dropdown
            placeholder="Pilih saldo eMoney"
          >
            <option value={1}>Saldo GOPAY 50.000</option>
            <option value={2}>Saldo OVO 50.000</option>
          </ListInput>
        </List>
        <Block margin='my-1'>
          <div className="grid grid-cols-1 gap-2">
            <div className='col-span-2'>
              Harga: {price} {coinSymbol}
            </div>
            <div>
              <Button disabled={!enableBtnNewPayment} onClick={() => 
                setShowConfirmPayment(true)}>Bayar</Button>
            </div>
          </div>
        </Block>
      </Card>
    );
  }

  return (
    <div className='grid grid-cols-1 gap-2'>
      <Card className='flex flex-col'>
        <div className='text-center'>
          Saldo {coinSymbol}<br />
          {wei2fiat(balance.coin)}<br />
          &nbsp;
        </div>
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
              Pembelian
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

      <Dialog
        opened={showConfirmPayment}
        onBackdropClick={() => setShowConfirmPayment(false)}
        title="Belanja"
        content={confirmPaymentView}
        buttons={
          <>
            <DialogButton onClick={() => setShowConfirmPayment(false)}>
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