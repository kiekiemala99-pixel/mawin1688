export function AuthHidden() {
  return (
    <>
      <input type="hidden" name="auth" className="staff-auth" defaultValue="" />
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{var t=localStorage.getItem('grok-auth.bearer-token')||sessionStorage.getItem('grok-auth.bearer-token')||new URLSearchParams(location.search).get('auth')||'';document.querySelectorAll('input.staff-auth').forEach(function(i){if(t)i.value=t})}catch(e){}",
        }}
      />
    </>
  );
}
