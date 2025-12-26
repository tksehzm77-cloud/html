$(function(){
    // $("선택자").실행할 함수 이름
    $(".family2 .family_list").hide()
    $(".family .family_list").hide()

    // 첫번째 패밀리 버튼을 클릭하면 family list 보임/숨김
    $(".family button").click(function(){
        $(".family .family_list").toggle()
    })
    $(".family2 button").click(function(){
        $(".family2 .family_list").toggle()
    })
    $(".family button").click(function(){
        $(".family2 .family_list").hide()
    })
    $(".family2 button").click(function(){
        $(".family .family_list").hide()
    })
})