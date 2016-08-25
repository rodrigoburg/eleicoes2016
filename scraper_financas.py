import urllib
import requests
import json
from pandas import DataFrame, read_csv
from bs4 import BeautifulSoup
import datetime

def scraper():
	url = 'http://divulgacandcontas.tse.jus.br/divulga/rest/v1/prestador/consulta/2/2016/71072/11/'
	candidatos = read_csv('cands.csv').to_dict(orient='records')
	saida = []
	Sessao = requests.Session()
	for item in candidatos:
		nova_url = url + str(item['num']) + '/' + str(item['num']) + '/' + str(item['sequencial'])
		r = json.loads(Sessao.get(nova_url).text)
		item['hora_atualizacao'] = datetime.datetime.now().strftime("%H:%M% %d/%m/%Y")
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
		saida.append(item)

	saida = DataFrame(saida).fillna(0)
	saida.to_csv('arrecadao_prefs_sp.csv',index=None)

scraper()

