'use strict';
const filtroMatriculaAtiva=()=>`or=(expira_em.is.null,expira_em.gt.${encodeURIComponent(new Date().toISOString())})`;
module.exports={filtroMatriculaAtiva};
