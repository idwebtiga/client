import { ethers, parseEther, formatEther } from 'ethers';

const e9 = '000000000';
const e18 = e9 + e9;

function bigIntReplacer(_key, value) {
  return typeof value === 'bigint' ? value.toString() : value;
}

function wei2fiat(wei) {
  const val = formatEther(wei);
  let ret = (Math.floor(Number(val) * 100) / 100) + '';
  return ret;
}

const openUrl = (url, otherTab) => {
  if (otherTab)
    window.open(url, '_blank');
  else
    window.open(url, '_self');
}

const refreshPage = () => {
  window.location.reload();
}

const delay = async (ms) => {
  console.log('wait for ' + (ms / 1000) + ' secs...');
  return new Promise((resolve,) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

const getTokenforAddress = (address) => {
  return window.localStorage.getItem("TOKEN" + address.toUpperCase());
}

const setTokenForAddress = (address, token) => {
  window.localStorage.setItem("TOKEN" + address.toUpperCase(), token);
}

const removeTokenForAddress = (address) => {
  window.localStorage.removeItem("TOKEN" + address.toUpperCase());
}

export default {
  openUrl,
  refreshPage,
  delay,
  e9,
  e18,
  bigIntReplacer,
  wei2fiat,
  getTokenforAddress,
  setTokenForAddress,
  removeTokenForAddress
}