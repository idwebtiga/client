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

const { useStore } = store;
const { wei2fiat } = Lib;

export default function Loan(props) {
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

  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [amountPayLoan, setAmountPayLoan] = useState('');

  const onChangeAmountPayLoan = (e) => {
    setAmountPayLoan(e.target.value);
  };

  const setPayLoanMax = () => {
    const loan = zilData.loans[selectedIndex];
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
    const loan = zilData.loans[selectedIndex];
    if (!(apl > 0n)) return toast.error('Invalid amount.');
    const nftId = loan.nftId;
    await payLoanViaDelegator(nftId, apl);
  }

  const panelPayLoan = () => {
    return (
      <div>
        <Block margin='my-1'>
          <pre>
            Owned: {wei2fiat(balance.coin)} {coinSymbol}<br />
            Allowance: {wei2fiat(zilData.allowanceCoin)} {coinSymbol}
          </pre>
        </Block>
        <List margin='my-1'>
          <ListInput
            label="Amount loan to pay"
            type="text"
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
              <Button onClick={doPayLoanByDelegator}>Pay Loan</Button>
            </div>
          </div>
        </Block>
      </div>
    );
  };

  let loans = [];
  if (zilData && zilData.loans) loans = zilData.loans;
  // console.log({ zilData, loans })

  return (
    <div>
      {loans.map((loan, index) => {
        return (
          <Card outline key={index}>
            <div className='flex gap-0'>
              <div className="flex-0 flex items-center justify-center">
                <Radio
                  name="select-nft"
                  value={index}
                  checked={index === selectedIndex}
                  onChange={() => setSelectedIndex(index)}
                />
              </div>
              <div className="flex-1">
                <Block margin='my-1'>
                  <pre>
                    Loan id: {Number(loan.nftId)}<br />
                    Collateral: {wei2fiat(loan.staked)} {tokenSymbol}<br />
                    Loan: {wei2fiat(loan.borrowed)} {coinSymbol}
                  </pre>
                </Block>
              </div>
            </div>
          </Card>
        );
      })}
      {panelPayLoan()}
    </div>
  )
}