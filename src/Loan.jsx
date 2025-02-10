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
  Radio
} from 'konsta/react';
import { useLocation } from "wouter";
import { BrowserProvider, JsonRpcSigner, formatEther, parseUnits, Contract, parseEther } from 'ethers';
import toast, { Toaster } from 'react-hot-toast';
import store from './store/store';
import Lib from './Lib';
import Config from './Config';
import { IoMdArrowBack } from "react-icons/io";

const { useStore } = store;
const { wei2fiat } = Lib;

export default function Loan(props) {
  let { nftId, onBack } = props;
  nftId = Number(nftId);
  console.log({ nftId });
  const { signer, contracts, balance, gasSymbol, coinSymbol, tokenSymbol,
    setTxModalVisible,
    setTxModalStop,
    refreshBalance,
    refreshDaoData,
    refreshZilData,
    zilData,
    takeLoan,
    approveCoinZil,
    payLoan,
    payLoanViaDelegator
  } = useStore();

  const [amountPayLoan, setAmountPayLoan] = useState('');

  let loans = [];
  if (zilData && zilData.loans) loans = zilData.loans;
  let loan = false;
  for (let i = 0; i < loans.length; i++) {
    if (Number(loans[i].nftId) === nftId) loan = loans[i];
  }

  let info = null;

  const onChangeAmountPayLoan = (e) => {
    setAmountPayLoan(e.target.value);
  };

  const setPayLoanMax = () => {
    const val = formatEther(loan.borrowed);
    setAmountPayLoan(val);
  }

  const apl = Number(amountPayLoan) > 0 ? BigInt(parseEther(amountPayLoan)) : 0n;
  const disableApprove = apl <= 0n || (apl > 0n && zilData.allowanceCoin > 0n && zilData.allowanceCoin >= apl);

  const approvePayLoan = async () => {
    if (!(apl > 0n)) return toast.error('Invalid amount.');
    await approveCoinZil(apl);
  }

  const doPayLoan = async () => {
    const loan = zilData.loans[selectedIndex];
    if (!(apl > 0n)) return toast.error('Invalid amount.');
    const nftId = loan.nftId;
    await payLoan(nftId, apl);
  }

  const doPayLoanByDelegator = async () => {
    if (!(apl > 0n)) return toast.error('Invalid amount.');
    const nftId = loan.nftId;
    await payLoanViaDelegator(nftId, apl);
  }

  const panelPayLoan = () => {
    return (
      <div>
        <Block margin='my-1'>
          NFT Id: {Number(loan.nftId)}<br />
          Jaminan: {wei2fiat(loan.staked)} {tokenSymbol}<br />
          Pinjaman: {wei2fiat(loan.borrowed)} {coinSymbol}<br />
          Pembayaran tersedia: {wei2fiat(balance.coin)} {coinSymbol}<br />
        </Block>
        <List margin='my-1'>
          <ListInput
            label={"Jumlah " + coinSymbol + ' untuk dibayarkan'}
            type="number"
            value={amountPayLoan}
            onChange={onChangeAmountPayLoan}
          />
        </List>
        <Block margin='my-1' className='grid gap-2'>
          <div className="grid grid-cols-3 gap-2">
            <div className=''>
              <Button outline onClick={setPayLoanMax}>Max</Button>
            </div>
            <div className='col-span-2'>
              <Button onClick={doPayLoanByDelegator}>Bayar Pinjaman</Button>
            </div>
          </div>
        </Block>
      </div>
    );
  };

  return (
    <div>
      <Card>
        <div className='flex flex-row'>
          <div className=''>
            <Button clear onClick={onBack}>
              <IoMdArrowBack size={32} />
            </Button></div>
          <div className='text-right'></div>
        </div>
      </Card>
      <Card>
        {panelPayLoan()}
      </Card>
    </div>
  )
}