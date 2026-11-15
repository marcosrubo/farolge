'use strict';
// Names are fixed by connection type. INBOX is Gmail's existing system label.
const PERSONAL_CATEGORIES=Object.freeze(['1-ME DEVEM','2-MINHAS','3-DEVO']);
const DISPATCHED_LABEL='4-DESPACHADO';
const PERSONAL_LABELS=Object.freeze([...PERSONAL_CATEGORIES,DISPATCHED_LABEL]);
const GENERAL_LABELS=Object.freeze(['Classificadas','Arquivadas']);
module.exports={PERSONAL_CATEGORIES,DISPATCHED_LABEL,PERSONAL_LABELS,GENERAL_LABELS};
