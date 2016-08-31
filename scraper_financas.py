import urllib
import requests
import json
from pandas import DataFrame, read_csv
from bs4 import BeautifulSoup
import datetime
from pymongo import MongoClient
import os

def conecta(db):
    client = MongoClient()
    my_db = client["eleicoes2016"]
    my_collection = my_db[db]
    return my_collection

def scraper_sp():
	path = os.path.dirname(os.path.abspath(__file__)) + '/'
	datas = {}
	with open(path+'arrecadacao_prefs_sp.json','r') as file:
		dados = json.load(file)

	#cria uma lista de datas que já temos para cada candidato
	for seq in dados:
		if seq not in datas:
			datas[seq] = []
		for data in dados[seq]['parciais']:
			datas[seq].append(data['data_atualizacao_TSE'])

	url = 'http://divulgacandcontas.tse.jus.br/divulga/rest/v1/prestador/consulta/2/2016/71072/11/'

	Sessao = requests.Session()
	for seq in dados:
		nova_url = url + str(dados[seq]	['num']) + '/' + str(dados[seq]['num']) + '/' + str(seq)
		r = json.loads(Sessao.get(nova_url).text)
		item = {}
		item['data_atualizacao_TSE'] = r['dataUltimaAtualizacaoContas']

		#se essa data já estiver salva no arquivo original, então pulamos para o próximo candidato
		if item['data_atualizacao_TSE'] in datas[seq]:
			continue

		item['hora_atualizacao'] = datetime.datetime.now().strftime("%H:%M %d/%m/%Y")
		item['total_recebido'] = r['dadosConsolidados']['totalRecebido']
		item['total_num_doadores'] = r['dadosConsolidados']['qtdRecebido']
		item['pf_recebido'] = r['dadosConsolidados']['totalReceitaPF']
		item['pf_num_doadores'] = r['dadosConsolidados']['qtdReceitaPF']
		item['pj_recebido'] = r['dadosConsolidados']['totalReceitaPJ']
		item['pj_num_doadores'] = r['dadosConsolidados']['qtdReceitaPJ']
		item['partidos_recebido'] = r['dadosConsolidados']['totalPartidos']
		item['partidos_num_doadores'] = r['dadosConsolidados']['qtdPartidos']
		item['proprios_recebido'] = r['dadosConsolidados']['totalProprios']
		item['total_despesas_cont'] = r['despesas']['totalDespesasContratadas']
		item['total_despesas_pagas'] = r['despesas']['totalDespesasPagas']
		for key in item:
			if not item[key]:
				item[key] = 0
		dados[seq]['parciais'].append(item)

	with open(path+'arrecadacao_prefs_sp.json','w') as file:
		json.dump(dados,file)

	#saida = DataFrame(dados).fillna(0)
	#print(saida)
#	saida.to_csv('arrecadacao_prefs_sp.csv',index=None)

def scraper_br():
	conexao = conecta('receitas_pref')
	url = 'http://divulgacandcontas.tse.jus.br/divulga/rest/v1/prestador/consulta/2/2016/'
	candidatos = read_csv('cands_br.csv').to_dict(orient='records')
	Sessao = requests.Session()
	for item in candidatos:
		print(item['nome'], item['sigla'], item['mun'])
		nova_url = url + str(item['cod_mun']) + '/11/' + str(item['num_cand']) + '/' + str(item['num_cand']) + '/' + str(item['sequencial'])
		r = json.loads(Sessao.get(nova_url).text)
		item['hora_atualizacao'] = datetime.datetime.now().strftime("%H:%M %d/%m/%Y")
		item['data_atualizacao_TSE'] = r['dataUltimaAtualizacaoContas']
		item['total_recebido'] = r['dadosConsolidados']['totalRecebido']
		item['total_num_doadores'] = r['dadosConsolidados']['qtdRecebido']
		item['pf_recebido'] = r['dadosConsolidados']['totalReceitaPF']
		item['pf_num_doadores'] = r['dadosConsolidados']['qtdReceitaPF']
		item['pj_recebido'] = r['dadosConsolidados']['totalReceitaPJ']
		item['pj_num_doadores'] = r['dadosConsolidados']['qtdReceitaPJ']
		item['partidos_recebido'] = r['dadosConsolidados']['totalPartidos']
		item['partidos_num_doadores'] = r['dadosConsolidados']['qtdPartidos']
		item['proprios_recebido'] = r['dadosConsolidados']['totalProprios']
		item['total_despesas_cont'] = r['despesas']['totalDespesasContratadas']
		item['total_despesas_pagas'] = r['despesas']['totalDespesasPagas']
		for key in item:
			if not item[key]:
				item[key] = 0
		conexao.insert(item)


def calcula_br():
	conexao = conecta('receitas_pref')
	pipe = [
		{'$group':
			{
			'_id': '$sequencial',
			'nome': {'$first':'$nome'},
			'sigla': {'$first':'$sigla'},
			'mun': {'$first':'$mun'},
			'uf': {'$first':'$uf'},
			'valor_total': {'$sum': "$total_recebido"},
			'valor_pf': {'$sum': "$pf_recebido"},
			'valor_partido': {'$sum': "$partidos_recebido"},
			'valor_proprio': {'$sum': "$proprios_recebido"}
		}}]
	'''pipe = [{
		'$group': {
			'_id':'null',
			'valor_total': {'$sum': "$total_recebido"},
			'valor_proprio': {'$sum': "$proprios_recebido"}
		}
	}]'''
	dados = conexao.aggregate(pipe,allowDiskUse=True)
	saida = [d for d in dados]
	dados = DataFrame(saida)
	print(dados)
	dados.to_csv('receitas_br.csv',index=None)

scraper_sp()
#scraper_br()
#calcula_br()
