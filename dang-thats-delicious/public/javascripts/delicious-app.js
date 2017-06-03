import '../sass/style.scss';

import { $, $$ } from './modules/bling';

import autocomplete from './modules/autocomplete';
import typeAhead from './modules/typeAhead';
import makeMap from './modules/map';
import ajaxHeart from './modules/heart';

autocomplete($('#address'), $('#lng'), $('#lat')); 
typeAhead($('.search'));
makeMap($('#map'));

const heartsForm = $$('form.heart');
heartsForm.on('submit', ajaxHeart);
