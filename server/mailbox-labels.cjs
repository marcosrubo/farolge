'use strict';
// Gmail names are Farol-owned; titles shown in the portal omit the GE_ prefix.
const PERSONAL_TITLES=Object.freeze(['ME DEVEM','MINHAS','DEVO']);
const PERSONAL_CATEGORIES=Object.freeze(PERSONAL_TITLES.map(title=>'GE_'+title));
const DISPATCHED_LABEL='GE_Despachadas';
const PERSONAL_LABELS=Object.freeze([...PERSONAL_CATEGORIES,DISPATCHED_LABEL]);
const GENERAL_LABELS=Object.freeze(['GE_Classificadas','GE_Arquivadas']);
module.exports={PERSONAL_TITLES,PERSONAL_CATEGORIES,DISPATCHED_LABEL,PERSONAL_LABELS,GENERAL_LABELS};
