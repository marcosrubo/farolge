'use strict';
const {isIP}=require('node:net');

function publicIP(headers){
  const forwarded=headers['x-vercel-forwarded-for']||headers['x-forwarded-for'];
  const ip=typeof forwarded==='string'?forwarded.split(',')[0].trim():'';
  return isIP(ip)&&!ip.includes('%')?ip:null;
}

function approximateLocation(headers){
  const rawCity=headers['x-vercel-ip-city'];
  const rawRegion=headers['x-vercel-ip-country-region'];
  const region=typeof rawRegion==='string'&&/^[A-Z0-9]{1,3}$/i.test(rawRegion)?rawRegion.toUpperCase():null;
  let city=null;
  if(typeof rawCity==='string'&&rawCity.length<=768){
    try{
      const decoded=decodeURIComponent(rawCity).trim().normalize('NFC');
      if(/^[\p{L}\p{M}\p{N} .’'\p{Pd}]{1,120}$/u.test(decoded))city=decoded;
    }catch{}
  }
  return [city,region].filter(Boolean).join('/')||null;
}

const browsers=[
  [/Edg(?:A|iOS)?\/|Edge\//i,'Edge'],
  [/SamsungBrowser\//i,'Samsung Internet'],
  [/OPR\/|OPiOS\/|Opera\//i,'Opera'],
  [/Firefox\/|FxiOS\//i,'Firefox'],
  [/Chrome\/|CriOS\//i,'Chrome'],
  [/Chromium\//i,'Chromium'],
  [/Version\/.*Safari\//i,'Safari']
];

function describeDevice(userAgent){
  const ua=typeof userAgent==='string'?userAgent.slice(0,1024):'';
  if(!ua)return null;

  const android=/Android/i.test(ua);
  const systems=[
    [/iPad/i,'iPadOS'],
    [/iPhone|iPod/i,'iOS'],
    [/Android/i,'Android'],
    [/Windows/i,'Windows'],
    [/CrOS/i,'ChromeOS'],
    [/Macintosh|Mac OS X/i,'macOS'],
    [/Linux/i,'Linux']
  ];
  const system=systems.find(([pattern])=>pattern.test(ua))?.[1];
  const browser=browsers.find(([pattern])=>pattern.test(ua))?.[1];
  let device;
  if(/iPad|Tablet/i.test(ua))device='Tablet';
  else if(/iPhone|iPod|Mobile/i.test(ua))device='Celular';
  else if(android)device='Dispositivo Android';
  else if(system)device='Computador';

  return [device,system,browser].filter(Boolean).join(' · ')||null;
}

module.exports={publicIP,describeDevice,approximateLocation};
