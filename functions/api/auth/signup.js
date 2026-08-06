export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: "회원가입 API가 정상적으로 호출되었습니다.",
        received: body
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=UTF-8"
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "요청 데이터를 처리할 수 없습니다."
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json; charset=UTF-8"
        }
      }
    );
  }
}