'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../js/agoraprescreva-caso-03-rules');

const item = (id, fields={}) => ({id,name:rules.catalog.find(entry=>entry.id===id).name,...fields});

test('identifica doses e vias de referência para cálcio e insulina',()=>{
  const result=rules.evaluate({items:[
    item('calcium-gluconate',{concentration:'10%',dose:'30',unit:'mL',route:'IV',duration:'10'}),
    item('regular-insulin',{dose:'10',unit:'UI',route:'IV',name:'Insulina humana regular'}),
    item('glucose-50',{concentration:'50%',dose:'50',unit:'mL',route:'IV'})
  ]});
  assert.equal(result.items.find(entry=>entry.ruleId==='order-calcium-gluconate').status,'Correto');
  assert.equal(result.items.find(entry=>entry.ruleId==='order-regular-insulin').status,'Correto');
  assert.equal(rules.glucoseGrams(item('glucose-50',{dose:'50',unit:'mL'})),25);
});

test('aponta via incorreta e cálcio ausente como omissão crítica',()=>{
  const result=rules.evaluate({items:[item('calcium-gluconate',{concentration:'10%',dose:'30',unit:'mL',route:'Oral',duration:'10'})]});
  assert.equal(result.items.find(entry=>entry.ruleId==='order-calcium-gluconate').status,'Parcialmente correto');
  assert.equal(result.safe,false);
  assert.ok(result.items.find(entry=>entry.ruleId==='missing-urgent-dialysis'));
});

test('marca insulina sem glicose e prescrição de potássio como riscos críticos',()=>{
  const result=rules.evaluate({items:[item('regular-insulin',{dose:'10',unit:'UI',route:'IV'}),item('potassium',{dose:'10',unit:'mEq',route:'IV'})]});
  assert.equal(result.items.find(entry=>entry.ruleId==='order-regular-insulin').severity,'critical');
  assert.equal(result.items.find(entry=>entry.ruleId==='danger-potassium').status,'Potencialmente perigoso');
  assert.equal(result.safe,false);
});

test('reconhece equivalência de glicose e verifica prevenção de hipoglicemia',()=>{
  assert.equal(rules.glucoseGrams(item('glucose-20',{dose:'125',unit:'mL'})),25);
  assert.equal(rules.glucoseGrams(item('glucose-10-bolus',{dose:'250',unit:'mL'})),25);
  const result=rules.evaluate({items:[item('glucose-10-infusion',{concentration:'10%',dose:'50',unit:'mL/h',route:'IV',duration:'5'})]});
  assert.equal(result.items.find(entry=>entry.ruleId==='order-glucose-10-infusion').status,'Correto');
});

test('mantém pesos fixos da pontuação e reserva 20 pontos para nefrologia e diálise',()=>{
  const correct=rules.evaluate({items:[
    item('calcium-gluconate',{concentration:'10%',dose:'30',unit:'mL',route:'IV',duration:'10'}),
    item('regular-insulin',{dose:'10',unit:'UI',route:'IV'}),
    item('glucose-50',{concentration:'50%',dose:'50',unit:'mL',route:'IV'}),
    item('glucose-10-infusion',{concentration:'10%',dose:'50',unit:'mL/h',route:'IV',duration:'5'}),
    item('salbutamol',{dose:'10',unit:'mg',route:'Nebulização',concentration:'5 mg/mL',volume:'2 mL'}),
    item('nephrology'),item('urgent-dialysis'),item('cardiac-monitor'),item('serial-ecg'),item('serial-potassium'),item('serial-glucose')
  ]});
  assert.equal(correct.score,100);
  assert.equal(correct.safe,true);
  const omission=rules.evaluate({items:[item('urgent-dialysis')]});
  assert.equal(omission.groupScores.removalAndDialysis,10);
  assert.equal(omission.score,10);
});

test('verifica conversão dose-volume do salbutamol e identifica duplicidade perigosa',()=>{
  const salbutamol=rules.evaluate({items:[item('salbutamol',{dose:'10',unit:'mg',route:'Nebulização',concentration:'5 mg/mL',volume:'1 mL'})]});
  assert.equal(salbutamol.items.find(entry=>entry.ruleId==='order-salbutamol').status,'Parcialmente correto');
  const duplicate=rules.evaluate({items:[item('regular-insulin',{dose:'10',unit:'UI',route:'IV'}),item('regular-insulin',{dose:'10',unit:'UI',route:'IV'})]});
  assert.equal(duplicate.items.find(entry=>entry.ruleId==='duplicate-regular-insulin').severity,'critical');
});

test('preserva a navegação dos Casos 01 e 02 e publica acesso consistente aos três casos',()=>{
  const fs=require('node:fs');
  const page=fs.readFileSync(require('node:path').join(__dirname,'../agoraprescreva.html'),'utf8');
  const case02=fs.readFileSync(require('node:path').join(__dirname,'../agoraprescreva-caso-02.html'),'utf8');
  const case03=fs.readFileSync(require('node:path').join(__dirname,'../agoraprescreva-caso-03.html'),'utf8');
  assert.match(page,/href="agoraprescreva-caso-02\.html"/);
  assert.match(page,/href="agoraprescreva-caso-03\.html"/);
  assert.match(case02,/href="agoraprescreva\.html"/);
  assert.match(case02,/href="agoraprescreva-caso-03\.html"/);
  assert.match(case03,/href="agoraprescreva\.html"/);
  assert.match(case03,/href="agoraprescreva-caso-02\.html"/);
  assert.match(case03,/Verificando acesso ao curso/);
  assert.match(case03,/id="rx-finish"/);
});
