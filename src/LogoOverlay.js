import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import aesLogoWhite from './img/aes-logo-white-shadow.png';
import honeywell from './img/honeywell-white.png';
import CONFIG from './config.json';


const useStyles = makeStyles((theme) => ({
  root: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    'margin-bottom': 24,
    display: 'flex',
    'flex-direction': 'column',
  },
  aesLogo: {
    padding: 8,
    height: 50,
  },
  suLogoContainer: {
    padding: "4px 8px",
    maxWidth: 220,
    color: "white",
    fontSize: "9pt",
  },
  honeywellLogo: {
    padding: 0,
    height: 50,
  },
}));


export default function LogoOverlay(props) {
  const classes = useStyles();

  const map = CONFIG['maps'][props.selectedMapId];
  // 2020-09-08: Stanford requested removal of logo in favor of explanatory
  // text. Can be re-added at some point in the future.
  var suLogoDisplay = map['displayStanfordLogo'] ? 'block' : 'none'
  var hwLogoDisplay = map['displayHoneywellLogo'] ? 'block' : 'none'



  return (
    <div className={classes.root}>
      <div
        className={classes.suLogoContainer}
        style={{display: suLogoDisplay}} >
        Developed by American Energy Society in collaboration with Sally Benson,
        Precourt Family Professor at Stanford University, and Scott Jespersen,
        MS '20, Stanford.
      </div>
      <div className={classes.honeywellLogoContainer}
         style={{display: hwLogoDisplay}}>
         <a href="https://www.honeywell.com/us/en/company/sustainability" target="_blank" rel="noopener noreferrer">
           <img
             src={honeywell}
             className={classes.honeywellLogo}
             alt="Honeywell Logo" />
         </a>
       </div>
      <div className={classes.aesLogoContainer}>
        <a href="https://www.energysociety.org" target="_blank" rel="noopener noreferrer">
        <img
          src={aesLogoWhite}
          className={classes.aesLogo}
          alt="American Energy Society Logo" />
        </a>    
      </div>
    </div>
  );
}
