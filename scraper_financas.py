import urllib
import requests
import json
from pandas import DataFrame, read_csv, read_sql_query, concat
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
		print(nova_url)
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

def acha_cands_cidades():
	from sqlalchemy import create_engine

	dados = read_csv('cands_cidades.csv')
	dados = dados.to_dict(orient='records')

	saida = []
	engine = create_engine('mysql+pymysql://root:@localhost:3306/eleicoes', echo=False)
	for item in dados:
		query = "SELECT UF, SEQUENCIAL, COD_MUN, NOME_URNA, MUN, NUM_CAND, SIGLA FROM cand2016 WHERE CARGO = 'PREFEITO' AND UF = '"+item['UF ']+"' AND MUN = '"+item['MUNICÍPIO']+"'"
		df = read_sql_query(query, engine)
		print(item['MUNICÍPIO'], str(len(df)))
		saida.append(df)

	saida = concat(saida)
	print(saida)
	temp = saida.to_dict(orient='records')
	saida = {}
	traducao = {
		"NOME_URNA":"nome",
		"NUM_CAND":"num"
	}
	for item in temp:
		item_novo = {}
		for key in item:
			if key in traducao:
				item_novo[traducao[key]] = item[key]
			elif key != 'SEQUENCIAL':
				item_novo[key.lower()] = item[key]
		saida[item['SEQUENCIAL']] = item_novo

	path = os.path.dirname(os.path.abspath(__file__)) + '/'
	with open(path+'arrecadacao_prefs_cidades.json','w') as file:
		json.dump(saida,file)


def conserta_data(data):
	#variaveis que vamos usar para o período minimo e máximo de datas possíveis
	data_min = "2016-08-16"
	data_max = datetime.datetime.now().strftime("%Y-%m-%d")
	if data < data_min:
		return data_min
	elif data > data_max:
		return data_max
	return data

def scraper_cidades():
	path = os.path.dirname(os.path.abspath(__file__)) + '/'
	datas = {}

	with open(path+'arrecadacao_prefs_cidades.json','r') as file:
		dados = json.load(file)

	#cria uma lista de datas que já temos para cada candidato
	for seq in dados:
		if seq not in datas:
			datas[seq] = []
		if 'parciais' not in dados[seq]:
			continue
		for data in dados[seq]['parciais']:
			datas[seq].append(data['data'])

	url1 = 'http://divulgacandcontas.tse.jus.br/divulga/rest/v1/prestador/consulta/2/2016/'
	url2 = 'http://divulgacandcontas.tse.jus.br/divulga/rest/v1/prestador/consulta/receitas/2/'

	Sessao = requests.Session()

	for seq in dados:
		nova_url1 = url1 + dados[seq]['cod_mun'] + '/11/'+ str(dados[seq]['num']) + '/' + str(dados[seq]['num']) + '/' + str(seq)
		r = json.loads(Sessao.get(nova_url1).text)
		print(nova_url1)

		item = dados[seq]
		parciais = []

		#se tiver declaracoes, vamos encher os dados que estão em parciais:
		if r['dadosConsolidados']['sqPrestadorConta'] is not None:

			#vamos fuçar os dados anteriores que estarão no end-point2
			nova_url2 = url2 + r['dadosConsolidados']['sqPrestadorConta'] + '/' + r['dadosConsolidados']['sqEntregaPrestacao']
			doacoes = json.loads(Sessao.get(nova_url2).text)
			print(nova_url2)

			temp = {}
			for doacao in doacoes:
				doacao['dtReceita'] = conserta_data(doacao['dtReceita'])
				if doacao['dtReceita'] not in temp:
					temp[doacao['dtReceita']] = 0
				temp[doacao['dtReceita']] += doacao['valorReceita']

			#agora soma as parciais novas com as anteriores
			datas = list(temp.keys())
			datas.sort()
			ordem_datas = {i:d for i,d in enumerate(datas)}
			for i in range(len(datas)):
				soma = temp[ordem_datas[i]]
				if i > 0:
					soma += temp[ordem_datas[i-1]]
				temp[ordem_datas[i]] = soma

			for data in temp:
				p = {'data':data, 'total_recebido':temp[data]}
				parciais.append(p)

		else:
			parciais.append({'data':conserta_data(r['dataUltimaAtualizacaoContas']),'total_recebido':0})

		item['parciais'] = parciais
		item['hora_atualizacao'] = datetime.datetime.now().strftime("%H:%M %d/%m/%Y")
		item['total_recebido'] = r['dadosConsolidados']['totalRecebido']
		item['pf_recebido'] = r['dadosConsolidados']['totalReceitaPF']
		if r['dadosConsolidados']['totalInternet']:
			item['pf_recebido'] += r['dadosConsolidados']['totalInternet']
		item['partidos_recebido'] = r['dadosConsolidados']['totalPartidos']
		item['proprios_recebido'] = r['dadosConsolidados']['totalProprios']
		item['total_despesas_cont'] = r['despesas']['totalDespesasContratadas']
		item['total_despesas_pagas'] = r['despesas']['totalDespesasPagas']
		item['maiores_doadores'] = r['rankingDoadores']
		item['maiores_fornecedores'] = r['rankingFornecedores']
		item['mais_despesas'] = r['concentracaoDespesas']

		for key in item:
			if not item[key]:
				item[key] = 0
		dados[seq] = item

	with open(path+'arrecadacao_prefs_cidades.json','w') as file:
		json.dump(dados,file)

def scraper_br():
	conexao = conecta('receitas_pref')
	url = 'http://divulgacandcontas.tse.jus.br/divulga/rest/v1/prestador/consulta/2/2016/'
	candidatos = read_csv('cands_br.csv').to_dict(orient='records')
	Sessao = requests.Session()
	for item in candidatos:
		nova_url = url + str(item['cod_mun']).zfill(5) + '/11/' + str(item['num_cand']) + '/' + str(item['num_cand']) + '/' + str(item['sequencial'])
		print(item['nome'], item['sigla'], item['mun'], nova_url)

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
			'valor_proprio': {'$sum': "$proprios_recebido"},
			'valor_pf': {'$sum': "$pf_recebido"},
			'valor_partido': {'$sum': "$partidos_recebido"}
		}
	}]'''
	dados = conexao.aggregate(pipe,allowDiskUse=True)
	saida = [d for d in dados]
	dados = DataFrame(saida)
	print(dados)
	dados.to_csv('receitas_br.csv',index=None)

def junta_raca_grana():
	grana = read_csv('receitas_br.csv')
	grana.index = grana['_id']
	from sqlalchemy import create_engine
	engine = create_engine('mysql+pymysql://root:@localhost:3306/eleicoes', echo=False)
	query = "SELECT COD_MUN, SEQUENCIAL, RACA FROM cand2016 WHERE cargo = 'PREFEITO'"
	raca = read_sql_query(query, engine)
	raca.index = raca['SEQUENCIAL']
	saida = concat([grana,raca],axis=1)
	saida = saida.groupby(['COD_MUN','RACA']).sum()['valor_total'].to_dict()
	dados = {}
	for s in saida:
		mun = s[0]
		raca = s[1]
		if mun not in dados:
			dados[mun] = {}
		dados[mun][raca] = saida[s]

	print(len(dados))
	saida = {}
	for d in dados:
		maior = 0
		raca_maior = 'EMPATADO'
		if len(dados[d]) == 1:
			raca_maior = list(dados[d].keys())[0]
		else:
			for raca in dados[d]:
				if dados[d][raca] > maior:
					maior = dados[d][raca]
					raca_maior = raca
		if raca_maior not in saida:
			saida[raca_maior] = 0
		saida[raca_maior] +=1

	print(saida)

	#saida.to_csv('raca_grana_prefs.csv')



#scraper_sp()

#acha_cands_cidades()
scraper_cidades()

#scraper_br()
#calcula_br()
#junta_raca_grana()
