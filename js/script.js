//DIMENSOES DO GRAFICO
var margins = {top: 10, right: 70, bottom: 80, left: 55},
    width = Math.min(window.innerWidth - margins.right - margins.left - 20,900),
    height = 550 - margins.top - margins.bottom,
    w = window.innerWidth - 20;

var formato_data = d3.time.format("%d/%m/%Y");

var inicio_campanha = "2016-08-15";
var cidades = {};
var escolhido = ['SP',"SÃO PAULO"]
var dados_orig = {}
var cores = {
    PT:'#A11217',
    PSOL:'#BE003E',
    REDE:'#BC005C',
    PTC:'#BA007C',
    PCdoB:'#98007F',
    PP:'#7B057E',
    PRB:'#5E196F',
    NOVO:'#45187D',
    PPL:'#3A3A8B',
    PSB:'#00408F',
    PSDB:'#00528B',
    PROS:'#0066A4',
    PRTB:'#007CC0',
    PTB:'#009BDB',
    PRP:'#0096B2',
    PDT:'#009493',
    PHS:'#008270',
    PR:'#009045',
    PTN:'#00602D',
    PSC:'#5F8930',
    PMR:'#7BAC39',
    PTdoB:'#A3BD31',
    PV:'#CAD226',
    PMN:'#FEEE00',
    PSD:'#E9BC00',
    PEN:'#598F59',
    SD:'#e1c69d',
    PMDB:'#B6720A',
    PPS:'#9A740F',
    DEM:'#634600'
}
//TOOLTIP COM INFORMACOES DA LINHA
function cria_tooltip() {
    window.tooltip = d3.select("body").append("div")
      .attr("class", "infoTooltip")
      .style("position", "absolute")
      .style("padding", "4px 8px")
      .style("opacity", 0);
}

//função para replace all
function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}

function numero_com_pontos(x) {
    x = parseInt(x*100)/100;
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function inicia() {
    var ua = window.navigator.userAgent;
    var msie = ua.indexOf("MSIE ");
    // If Internet Explorer, return version number
    if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
        var ie_version = parseInt(ua.substring(msie + 5, ua.indexOf(".", msie)));
        alert('Este gráfico não funciona no Internet Explorer. Favor tentar em outro browser, como Chrome ou Firefox');
    }
    //se não for IE, começa tudo
    else
        d3.json ("arrecadacao_prefs_cidades.json", comeca_tudo);
}

function acha_mais_recente(data1,data2) {
    var old = data1.split('-')
    var novo = data2.split('-')
    if (parseInt(novo[1]) > parseInt(old[1])) { //se o mês for mais recente, já mudamos
        return data2;
    } else if (parseInt(novo[1]) == parseInt(old[1])) { //se for igual, vamos comparar os dias agora
        if (parseInt(novo[2]) > parseInt(old[2])) {
            return data2;
        }
    }
    return data1;
}

function conserta_dados(dados) {
    var saida = []
    var campos = []
    var datas = []
    //primeiro transforma os dados que já temos
    for (seq in dados) {
        dados[seq]['parciais'].forEach(function (d) {
            item = {}
            for (key in dados[seq]) {
                if (['mun','nome', 'num', 'sigla', 'uf'].indexOf(key) > -1) {
                    item[key] = dados[seq][key]
                }
            }
            for (key in d) {
                //tiramos aqui as datas de 1989, que na verdade é qnd não houve declaração de nada
                if (key == 'data') {
                    if (d[key] == "1989-12-31") {
                        d[key] = inicio_campanha
                    } else { //aqui populamos a lista datas com um set de todas as datas que temos
                        if (datas.indexOf(d[key]) == -1) {
                            datas.push(d[key])
                        }
                    }
                }
                item[key] = d[key]
            }

            //se for no primeiro loop, vamos só aqui pegar todos os campos que há em cada item e salvar em uma variável
            if (campos.length == 0) {
                for (key in item) {
                    campos.push(key)
                }
            }

            //aqui vamos povoar nosso dicionário de estados e municiípios para criar o select
            if (!(dados[seq]['uf'] in cidades)) {
                cidades[dados[seq]['uf']] = []
            }
            if (cidades[dados[seq]['uf']].indexOf(dados[seq]['mun']) == -1) {
                cidades[dados[seq]['uf']].push(dados[seq]['mun'])
            }
            saida.push(item)
        })

        //e aqui um dicionário de dados genéricos de cada candidato para fazermos a tooltip
        var tipos = ['proprios_recebido','pf_recebido','partidos_recebido']

        dados_orig[dados[seq]['nome']] = {}
        for (key in dados[seq]) {
            if (key != 'parciais') {
                dados_orig[dados[seq]['nome']][key] = dados[seq][key]
                if (tipos.indexOf(key) != -1) {
                    var temp = parseInt(dados[seq][key]*100/dados[seq]['total_recebido'])
                    dados_orig[dados[seq]['nome']][key+"_porc"] = isNaN(temp) ? 0 : temp;
                }
            }
        }
        dados_orig[dados[seq]['nome']]['sequencial'] = seq

    }

    //proximo passo: achar qual é a data mais recente que temos
    var data_hoje = inicio_campanha;
    datas.forEach(function (d) {
        data_hoje = acha_mais_recente(data_hoje,d)
    })

    //agora vamos voltar candidato por candidato e ver se há dados para o inicio da campanha e para hoje. se não houver, acrescentamos
    for (seq in dados) {
        var tem_comeco = false;
        var tem_final = false;
        data_mais_recente = inicio_campanha;
        dados[seq]['parciais'].forEach(function (d) {
            if (d['data'] == inicio_campanha) {
                tem_comeco = true;
            }
            if (d['data'] == data_hoje) {
                tem_final = true;
            }
            data_mais_recente = acha_mais_recente(data_mais_recente,d['data'])
        })

        //se não tiver data do comeco, vamos criar a info e deixar ela vazia
        if (tem_comeco == false) {
            var item = {}

            //aqui botamos todos os campos como zero, pois é inicio de campanha
            campos.forEach(function (d) {
                if (d == 'data') {
                    item[d] = inicio_campanha;
                } else {
                    item[d] = 0;
                }

            })
            //e aqui botamos as infos como nome, partido e numero
            for (key in dados[seq]) {
                if (['mun','nome', 'num', 'sigla', 'uf'].indexOf(key) > -1) {
                    item[key] = dados[seq][key]
                }
            }

            saida.push(item);
        }

        //agora para o final
        if (tem_final == false) {
            var item = {}

            //precisamos achar os dados para a data mais recente desse candidato
            dados[seq]['parciais'].forEach(function (d) {
                if (d['data'] == data_mais_recente) {
                    item = d;
                }
            })

            item['data'] = data_hoje;

            //e aqui botamos as infos como nome, partido e numero
            for (key in dados[seq]) {
                if (['mun','nome', 'num', 'sigla', 'uf'].indexOf(key) > -1) {
                    item[key] = dados[seq][key]
                }
            }

            saida.push(item)
        }

    }
    window.data = saida
    return saida
}

function desenha_dropdowns() {
    //arruma todas as ufs em ordem alfabetica
    for (uf in cidades) {
        cidades[uf].sort();
    }

    var ufs = $("#menu_ufs")
    var lista_ufs = Object.keys(cidades).sort()
    lista_ufs.forEach(function (uf) {
        if (uf == escolhido[0]) {
            var temp = '<li><a href="#">'+uf+' <span class="glyphicon glyphicon-ok distrito_ok"></span></a></li>'
        } else {
            var temp = '<li><a href="#">'+uf+'</a></li>'
        }
        ufs.append(temp)
    })

    $('#ufs').dropdown();
    $('#ufs').html(escolhido[0] + ' <span class="caret"></span>')

    ufs.find("li").on("click", function () {
        $(".cidade").remove()
        $('.glyphicon-ok').remove()

        uf = $(this).text().trim()
        escolhido[0] = uf;
        escolhido[1] = cidades[uf][0];
        $('#ufs').html(uf + ' <span class="caret"></span>')
        $(this).html('<a href="#">'+uf + ' <span class="glyphicon glyphicon-ok"></span></a>')

        evento_clique_mun(uf);
        muda_grafico();
    })

    $('#muns').dropdown();
    $('#muns').html(escolhido[1] + ' <span class="caret"></span>')
    evento_clique_mun(escolhido[0]);
}

function evento_clique_mun(uf) {
    var muns = $("#menu_muns")
    $('#muns').html(escolhido[1] + ' <span class="caret"></span>')
    cidades[uf].forEach(function (mun) {
        if (mun == escolhido[1]) {
            var temp = '<li><a class="cidade" href="#">'+mun+' <span class="glyphicon glyphicon-ok cidade_ok"></span></a></li>'
        } else {
            var temp = '<li><a class="cidade" href="#">'+mun+'</a></li>'
        }
        muns.append(temp)
    })

    muns.find("li").on("click", function () {
        $('.cidade_ok').remove()
        mun = $(this).text().trim()
        escolhido[1] = mun;
        $('#muns').html(mun + ' <span class="caret"></span>')
        $(this).html('<a class="cidade" href="#">'+mun + ' <span class="glyphicon glyphicon-ok cidade_ok"></span></a>')
        muda_grafico();

    })

}

function comeca_tudo(dados) {
    dados = conserta_dados(dados);
    desenha_dropdowns();

    var svg = dimple.newSvg("#grafico",width,height)
    dados = dimple.filterData(dados, "mun", escolhido[1]);

    var myChart = new dimple.chart(svg, dados);

    myChart.setBounds(margins.left, margins.top, width - margins.right, height - margins.bottom);
    var x = myChart.addTimeAxis("x", "data","%Y-%m-%d",'%d/%m');
    var y = myChart.addMeasureAxis("y", "total_recebido");

    y.title = 'Total de doações recebidas por candidato (R$)'
    x.title = ''

    var s = myChart.addSeries("nome", dimple.plot.line);
    s.interpolation = "monotone";
    s.lineMarkers = true;


    //customiza a tooltip
    /*s.getTooltipText = function(e) {
        var faixa = e.aggField[0];
        var distrito = e.aggField[1];
        return [
            distrito,
            faixa + ": R$ " + numero_com_pontos(e.y)
        ];
    };*/

    dados.forEach(function (d) {
        if (d['sigla'] in cores) {
            myChart.assignColor(d['nome'],cores[d['sigla']])
        }
    })

    s.lineWeight = 3;

    s.addEventHandler("mouseover", function (e){
        var nome = e.seriesValue[0]
        var dia = formato_data(e.xValue)

        cria_tooltip();

        tooltip.transition()
            .duration(200)
            .style("opacity", 1);
        var texto = "<div class='minicontainer'><p class=titulim><b>" + nome + " ("+dados_orig[nome]['sigla']+")</b></p>"
        texto += "<div><img id='img_perfil' src=http://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/foto/2/"+dados_orig[nome]['sequencial']+"></div>"
        texto += "<div class='textim'>R$" + numero_com_pontos(e.yValue)+"</div>"
        texto += "<div class='textim'>"+dia+"</div>"
        texto += "<div class='textimzim'><p>Doações próprias: "+dados_orig[nome]['proprios_recebido_porc'] + '%</p>'
        texto += "<p>Pessoas físicas e internet: "+dados_orig[nome]['pf_recebido_porc'] + '%</p>'
        texto += "<p>Partido: "+dados_orig[nome]['partidos_recebido_porc'] + '%</p></div>'
        texto += "</div>"
        tooltip.html(texto)
        tooltip.style("left", (d3.event.pageX + 10) + "px")
          .style("top", (d3.event.pageY - 50) + "px")
          .style("background", (dados_orig[nome]['sigla'] in cores) ? cores[dados_orig[nome]['sigla']] : 'gray' )


    })
    s.addEventHandler("mouseleave", function (e) {
            tooltip.transition()
                .duration(200)
                .style("opacity", 0);
            tooltip.remove();
    });

    legend = myChart.addLegend(45, -40, 900, 20, "left");

    myChart.draw();
    window.grafico = myChart

    /*torce as labels
    $(".dimple-axis-x").find('text').each(function (d) {
        $(this).attr('transform','rotate(30) translate(-50,0)');
    })*/

}

function muda_grafico() {
    var myChart = window.grafico
    var novos_dados = dimple.filterData(window.data,"mun",escolhido[1])
    myChart.data = novos_dados

    novos_dados.forEach(function (d) {
        if (d['sigla'] in cores) {
            myChart.assignColor(d['nome'],cores[d['sigla']])
        }
    })

    myChart.draw(1000);

}

//FUNCAO CHAMADA QUANDO O DOCUMENTO ESTA PRONTO
$(document).ready(function(){
    //abre metodologia no clique em AQUI
    $("#clique_calculo").click(function () {
        //mostra o div
        $("#calculo").css('display','block')
        //scroll pro div
        $('html, body').delay(60).animate({
            scrollTop: $("#calculo").offset().top - 50
        }, 500, 'easeInOutCubic');
        //todo o fundo cinza
        $('#overlay').fadeIn(300);
        $('#calculo').css('z-index', '99999');
    });

    $("#fecha_calculo").click(function () {
        $("#calculo").css('display','none')
        $('#overlay').fadeOut(300);
        $('#calculo').css('z-index', '1');
    })

});


inicia();

