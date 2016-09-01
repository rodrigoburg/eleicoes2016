//DIMENSOES DO GRAFICO
var margins = {top: 10, right: 70, bottom: 80, left: 55},
    width = Math.min(window.innerWidth - margins.right - margins.left - 20,900),
    margin2 = {top: 430, right: 25, bottom: 20, left: 40},
    height = 550 - margins.top - margins.bottom,
    height2 = 500 - margin2.top - margin2.bottom,
    w = window.innerWidth - 20;

var inicio_campanha = "2016-08-06"

//TOOLTIP COM INFORMACOES DA LINHA
var tooltip = d3.select("body").append("div")
      .attr("class", "infoTooltip")
      .style("position", "absolute")
      .style("padding", "4px 8px")
      .style("background", function(d) {return "orange"})
      .style("opacity", 0);

//função para replace all
function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}

function numero_com_pontos(x) {
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
        d3.json ("arrecadacao_prefs_sp.json", comeca_tudo);
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
                if (key != 'parciais') {
                    item[key] = dados[seq][key]
                }
            }
            for (key in d) {
                //tiramos aqui as datas de 1989, que na verdade é qnd não houve declaração de nada
                if (key == 'data_atualizacao_TSE') {
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

            saida.push(item)
        })
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
            if (d['data_atualizacao_TSE'] == inicio_campanha) {
                tem_comeco = true;
            }
            if (d['data_atualizacao_TSE'] == data_hoje) {
                tem_final = true;
            }
            data_mais_recente = acha_mais_recente(data_mais_recente,d['data_atualizacao_TSE'])
        })

        //se não tiver data do comeco, vamos criar a info e deixar ela vazia
        if (tem_comeco == false) {
            var item = {}

            //aqui botamos todos os campos como zero, pois é inicio de campanha
            campos.forEach(function (d) {
                if (d == 'data_atualizacao_TSE') {
                    item[d] = inicio_campanha;
                } else {
                    item[d] = 0;
                }

            })
            //e aqui botamos as infos como nome, partido e numero
            for (key in dados[seq]) {
                if (key != 'parciais') {
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
                if (d['data_atualizacao_TSE'] == data_mais_recente) {
                    item = d;
                }
            })

            item['data_atualizacao_TSE'] = data_hoje;

            //e aqui botamos as infos como nome, partido e numero
            for (key in dados[seq]) {
                if (key != 'parciais') {
                    item[key] = dados[seq][key]
                }
            }

            saida.push(item)
        }

    }
    window.data = saida
    return saida
}

function comeca_tudo(dados) {
    dados = conserta_dados(dados);
    var svg = dimple.newSvg("#wrapper",width,height)
    //data = dimple.filterData(data, "distrito", distrito_selec);

    var myChart = new dimple.chart(svg, dados);

    myChart.setBounds(margins.left, margins.top, width - margins.right, height - margins.bottom);
    var x = myChart.addTimeAxis("x", "data_atualizacao_TSE","%Y-%m-%d",'%d/%m');
    var y = myChart.addMeasureAxis("y", "total_recebido");

    y.title = 'Total de doações recebidas por candidato (R$)'
    x.title = ''

    var s = myChart.addSeries("nome", dimple.plot.line);
    s.interpolation = "monotone";
    s.lineMarkers = true;


    //customiza a tooltip
    s.getTooltipText = function(e) {
        console.log(e)
        var faixa = e.aggField[0];
        var distrito = e.aggField[1];
        return [
            distrito,
            faixa + ": R$ " + numero_com_pontos(e.y)
        ];
    };

    legend = myChart.addLegend(45, -40, 900, 20, "left");

    /*distritos.forEach(function (d) {
        myChart.assignColor(d,"#A11217")
    })*/


    myChart.draw();
    window.grafico = myChart

    /*torce as labels
    $(".dimple-axis-x").find('text').each(function (d) {
        $(this).attr('transform','rotate(30) translate(-50,0)');
    })*/

}

function formata_numero(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
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


  //CASO ALGUM ITEM DO MENU SEJA SELECIONADO
    $('#lista_times').change(function() {
        timeEscolhido =  $(this).children(":selected").attr("id");
        linhaSelecionada = $(".line")[timeEscolhido];
        mostraLinha(timeEscolhido, linhaSelecionada, true);
        redesenha_linha();
        coloca_tacinhas();
    });


});


inicia();

