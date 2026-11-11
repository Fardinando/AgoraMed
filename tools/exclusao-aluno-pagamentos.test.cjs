const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { criarBanco, ids } = require('./helpers/banco-curso.cjs');
const migration = name => fs.readFileSync(path.join(__dirname, '../supabase/migrations', name), 'utf8');

test('exclusão da conta preserva pedidos sandbox sem bloquear o Auth', async () => {
  const db = await criarBanco();
  try {
    await db.exec(migration('20261109090000_pedidos_pagamento_teste.sql'));
    await db.query('insert into pedidos_pagamento_teste(id,usuario_id,curso_id,preco_centavos,acesso_meses) values($1,$2,$3,9700,12)', ['88888888-8888-4888-8888-888888888888', ids.aluno, ids.curso]);
    await assert.rejects(db.query('delete from auth.users where id=$1', [ids.aluno]));
    await db.exec(migration('20261110235344_preservar_pedidos_teste_exclusao_aluno.sql'));
    await db.query('delete from auth.users where id=$1', [ids.aluno]);
    const orders = (await db.query('select usuario_id, preco_centavos from pedidos_pagamento_teste')).rows;
    assert.equal(orders.length, 1);
    assert.equal(orders[0].usuario_id, null);
    assert.equal(orders[0].preco_centavos, 9700);
    assert.equal((await db.query('select count(*)::int n from perfis where id=$1', [ids.aluno])).rows[0].n, 0);
  } finally { await db.close(); }
});
