String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

var dados;



function formata_valor( int ) { // Função para formatação de valor numérico para Real R$
    int = int.toString();
    int = int.split(/\.|,/);
    if ( int.length > 2 ) {
        return("erro")
    }
    inteiro = int[0]
    if ( int.length == 2 ) {
        decimal = int[1];
        if ( decimal.length==1 ) {
            decimal = decimal + "0";
        }
    }
    else {
        decimal = "00";
    }
    // Para colocar pontos nos inteiros, vamos lembrar das aulas
    // de estrutura de dados e usar uma pilha
    pilha = new Array();
    inteiro_final = new String();
    j  = 0;
    for (i=(inteiro.length-1);i>=0;i--) {
        pilha.push(inteiro[i]);
        j++;
        if ( j % 3 === 0 && i > 0 ) {
            pilha.push('.')
        }
    }
    tamanho_pilha = pilha.length;
    for (i=0; i<tamanho_pilha;i++) {
        inteiro_final = inteiro_final + pilha.pop();
    }
    return("R$ " + inteiro_final + "," + decimal)
}



function cria_tabela() {
    $("#content").append("<div id=tabela></div>")


    tableHTML = '<table class="tabela table table-hover table-condensed table-striped table-bordered">';
    tableHeader = "<thead><tr>"
    tableBody = "<tbody>"
    var lista_inicial = ['Candidato','Sigla','Total recebido','Total - PF','Total - Partido','Total - Próprio','Despesas contratadas','Despesas pagas','Hora atualização TSE','Hora scraping']

    lista_inicial.forEach(function (d) {
        tableHeader += "<th>" + d + "</th>";
    });
    tableHeader += "</tr></thead>"

    if (!(dados instanceof Array)) {
        dados = [dados]
    }

    dados.forEach(function (d) {
        var linha = "<tr>"
        linha += "<td>"+d["nome"]+"</td>"
        linha += "<td>"+d["sigla"]+"</td>"
        linha += "<td>"+formata_valor(d["total_recebido"])+"</td>"
        linha += "<td>"+formata_valor(d["pf_recebido"])+"</td>"
        linha += "<td>"+formata_valor(d["partidos_recebido"])+"</td>"
        linha += "<td>"+formata_valor(d["proprios_recebido"])+"</td>"
        linha += "<td>"+formata_valor(d["total_despesas_cont"])+"</td>"
        linha += "<td>"+formata_valor(d["total_despesas_pagas"])+"</td>"
        linha += "<td>"+d["data_atualizacao_TSE"]+"</td>"
        linha += "<td>"+d["hora_atualizacao"]+"</td>"
        linha += "</tr>"
        tableBody += linha
    })

    tableBody += "</tbody>"
    tableHTML += tableHeader + tableBody + "</table>"
    $("#tabela").append(tableHTML)

    table = $(".tabela").DataTable({
        "order": [[ 3, "desc" ]],
        "lengthMenu": [[100, -1], [100, "Todos"]],
        "language": {
            "lengthMenu": "Mostrar _MENU_ linhas por página",
            "zeroRecords": "Não foi encontrado nenhum item",
            "info": "Mostrando página _PAGE_ de _PAGES_",
            "infoEmpty": "Não foi encontrado nenhum item",
            "infoFiltered": "(filtrado do total de _MAX_ itens)",
            "paginate":{
                "previous":"Anterior",
                "next":"Próxima",
                "first":"Primeira",
                "last":"Última"
            }
        }
    });

    /*$var $tfoot = $('<tfoot></tfoot>');
    $($('thead').clone(true, true).children().get().reverse()).each(function(){
        $tfoot.append($(this));
    });
    $tfoot.insertAfter('table thead');


    ('.tabela tfoot th').each( function () {
        var title = $('.tabela thead th').eq( $(this).index() ).text();
        if (title == "Perfil" || title == "Categoria") {
            $(this).html( '<input type="text" placeholder="Buscar '+title+'" />' );
        } else {
            $(this).html("");
        }
    } );


    table.columns().every( function () {
        var that = this;
        $( 'input', this.footer() ).on( 'keyup change', function () {
            that
                .search( this.value )
                .draw();
        } );
    } );*/
    $(".dataTables_filter").remove();
    $("label").addClass("pull-left")

}

$.ajax({
    url: 'http://estadaodados.com/eleicoes2016/arrecadacao_prefs_sp.json',
    type: 'GET',
    dataType: "json",
    success: function (result) {
        dados = result;
        cria_tabela();
    },
    error: function () {
        $("#content").append("<div id=tabela></div>")
        $("#tabela").html("Arquivo de dados não eencontrado :(")
        }
    });