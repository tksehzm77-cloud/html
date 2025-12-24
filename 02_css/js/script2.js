$(function(){
    $("*").css({"margin":0,"padding":0})
    $(".wrap").css({"margin-bottom":50})
    $("ul").css({"display":"flex","gap":"20px"})
    $("ul li").css({"list-style":"none","width":200,"height":200,"border":"1px solid #000"})
    $("ul .box1").css({"background":"#fe0000"})
    $("ul .box2").css({"background":"#fea500"})
    $("ul .box3").css({"background":"#ffff00"})
    $("ul .box4").css({"background":"#008001"})

    // 숨김 버튼을 클릭하면 li .box1 숨김
    // 별명 지을 때 class="별명"
    // id="별명" -> 중복해서 사용하지 않을 때
    $("#btn1").click(function(){
        $("ul .box1").hide()
    })

    // 보이기 버튼을 클릭하면 li .box1가 보임
    $("#btn2").click(function(){
        $("ul .box1").show()
    })

    // 토글(보이기/숨김) 버튼을 클릭하면 nth-child(3) 숨김/보임
    $("#btn3").click(function(){
        $("ul .box3").toggle()

    })
    // 네번째 박스 100X100 버튼을 클릭하면 li .box4. 크기로
    $("#btn4").click(function(){
        $("ul .box4").width(100)
        $("ul .box4").height(100)
    })

    $("#btn5").click(function(){
        $("ul .box4").width(200)
        $("ul .box4").height(200)
    })




})