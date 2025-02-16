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
  SegmentedButton
} from 'konsta/react';
import { useLocation } from "wouter";
import { ethers, parseEther } from 'ethers';

import { BrowserProvider, JsonRpcSigner, formatEther, parseUnits, Contract } from 'ethers';
import toast, { Toaster } from 'react-hot-toast';
import store from './store/store';
import Lib from './Lib';
import Loan from './Loan';

const { useStore } = store;
const { e9, e18, CONFIG, bigIntReplacer, wei2fiat } = Lib;

export default function Stake(props) {
  const { signer, contracts, balance, gasSymbol, coinSymbol, tokenSymbol,
    zilData,
    calculatedCollateral,
    calcCollateral,
    takeLoanByResultByDelegator
  } = useStore();

  // const [amountStake, setAmountStake] = useState('');
  const [amountWanted, setAmountWanted] = useState('');
  const [showLoan, setShowLoan] = useState(-1);

  const onChangeAmountWanted = async (e) => {
    const val = e.target.value;
    setAmountWanted(val);
    const amount = Number(val) > 0 ? BigInt(parseEther(val)) : 0n;
    await calcCollateral(amount);
  };

  const setWantedMax = async () => {
    const val = formatEther(zilData.maxLoanCoin);
    setAmountWanted(val);
    const amount = Number(val) > 0 ? BigInt(parseEther(val)) : 0n;
    await calcCollateral(amount);
  };

  const doTakeLoanByResult = async () => {
    const amw = Number(amountWanted) > 0 ? BigInt(parseEther(amountWanted)) : 0n;
    if (!(amw > 0n)) return toast.error('Invalid amount.');
    await takeLoanByResultByDelegator(amw);
  }

  // const updateMaxBorrow = async (val) => {
  //   const amount = Number(val) > 0 ? BigInt(parseEther(val)) : 0n;
  //   await calcMaxBorrow(amount);
  // }

  // const onChangeAmountStake = async (e) => {
  //   const val = e.target.value;
  //   setAmountStake(val);
  //   await updateMaxBorrow(val);
  // };

  // const setStakeMax = async () => {
  //   const val = formatEther(balance.token);
  //   setAmountStake(val);
  //   await updateMaxBorrow(val);
  // };

  // const ams = Number(amountStake) > 0 ? BigInt(parseEther(amountStake)) : 0n;
  // const disableApprove = ams === 0n || (ams > 0n && zilData.allowanceToken > 0n && zilData.allowanceToken >= ams);

  // const approveStake = async () => {
  //   if (!(ams > 0n)) return toast.error('Invalid amount.');
  //   await approveTokenZil(ams);
  // }

  // const doStake = async () => {
  //   if (!(ams > 0n)) return toast.error('Invalid amount.');
  //   await takeLoan(ams);
  // }

  // const doTakeLoan = async () => {
  //   if (!(ams > 0n)) return toast.error('Invalid amount.');
  //   await takeLoanViaDelegator(ams);
  // }

  // const resultVal = Math.floor(Number(wei2fiat(maxBorrow)));

  // const panelStake = (
  //   <div className='-mx-4'>
  //     <Block margin='my-1'>
  //       <div>
  //         Jaminan tersedia: {wei2fiat(balance.token)} {tokenSymbol}<br />
  //         Maksimal pinjaman: {wei2fiat(zilData.availableLoanCoin)} {coinSymbol}<br />
  //       </div>
  //     </Block>
  //     <List margin='my-1'>
  //       <ListInput
  //         label={"Jumlah " + tokenSymbol + ' untuk dijaminkan'}
  //         type="number"
  //         value={amountStake}
  //         onChange={onChangeAmountStake}
  //       />
  //     </List>
  //     <Block margin='my-1'>
  //       <div className='mb-2'>
  //         {resultVal > 0 ? 'Pinjaman dicairkan: ' + resultVal + ' ' + coinSymbol : ' '}<br />
  //       </div>
  //     </Block>
  //     <Block margin='my-1'>
  //       <div className='grid grid-cols-1 gap-2'>
  //         <div className="grid grid-cols-3 gap-2">
  //           <div className=''>
  //             <Button outline onClick={setStakeMax}>Max</Button>
  //           </div>
  //           <div className='col-span-2'>
  //             <Button onClick={doTakeLoan}>Pinjam</Button>
  //           </div>
  //         </div>
  //       </div>
  //     </Block>
  //   </div>
  // );

  const panelWanted = (
    <div className='-mx-4'>
      <Block margin='my-1'>
        <div>
          Jaminan tersedia: {wei2fiat(balance.token)} {tokenSymbol}<br />
          Maksimal pinjaman: {wei2fiat(zilData.maxLoanCoin)} {coinSymbol}<br />
        </div>
      </Block>
      <List margin='my-1'>
        <ListInput
          label={'Jumlah pinjaman untuk diajukan'}
          type="number"
          value={amountWanted}
          onChange={onChangeAmountWanted}
        />
      </List>
      <Block margin='my-1'>
        <div className='mb-2'>
          {calculatedCollateral > 0 ? 'Jaminan dibutuhkan: ' + wei2fiat(calculatedCollateral) + ' ' + tokenSymbol : ' '}<br />
        </div>
      </Block>
      <Block margin='my-1'>
        <div className='grid grid-cols-1 gap-2'>
          <div className="grid grid-cols-3 gap-2">
            <div className=''>
              <Button outline onClick={setWantedMax}>Max</Button>
            </div>
            <div className='col-span-2'>
              <Button onClick={doTakeLoanByResult}>Pinjam</Button>
            </div>
          </div>
        </div>
      </Block>
    </div>
  );

  let loans = [];
  if (zilData && zilData.loans) loans = zilData.loans;

  if (showLoan > 0) {
    return (
      <div>
        <Loan nftId={showLoan} onBack={() => setShowLoan(-1)} />
      </div>
    );
  }

  return (
    <div>
      <Card>
        {panelWanted}
      </Card>
      <Card className=''>
        <List className='-m-4'>
          {loans.map(loan => {
            const status = 'Belum Lunas';
            return (
              <ListItem
                link
                header={"id: " + loan.nftId + ' - ' + status}
                title={wei2fiat(loan.borrowed) + ' ' + coinSymbol}
                footer={'Jaminan: ' + wei2fiat(loan.staked) + ' ' + tokenSymbol}
                onClick={() => setShowLoan(loan.nftId)}
              />
            );
          })}
        </List>
      </Card>
    </div>
  )
}