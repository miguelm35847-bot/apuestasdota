-- Pruebas de integración contra funciones reales. Todo se revierte al final.
begin;
do $$
declare u uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); r uuid; apuesta uuid:=gen_random_uuid(); saldo bigint; fallo boolean;
begin
 insert into auth.users(id,email,raw_user_meta_data) values(u,u||'@revision.invalid',jsonb_build_object('nick','qa-rev-'||left(u::text,8))),(v,v||'@revision.invalid',jsonb_build_object('nick','qa-rev-'||left(v::text,8)));
 insert into public.movimientos_billetera(user_id,tipo,monto) values(u,'recarga',10000),(v,'recarga',10000);
 insert into public.salas(nombre,cuota,cupo,comision_bp,estado,iniciada_at) values('QA revision rollback',1000,2,0,'en_juego',clock_timestamp()-interval '24 minutes') returning id into r;
 perform set_config('request.jwt.claim.sub',u::text,true);
 perform public.crear_apuesta_sala(r,1,apuesta);
 update public.salas set iniciada_at=clock_timestamp()-interval '25 minutes' where id=r;
 perform set_config('request.jwt.claim.sub',v::text,true);
 fallo:=false;
 begin perform public.aceptar_apuesta_sala(apuesta); exception when others then if sqlerrm not like 'Apuestas cerradas:%' then raise; end if; fallo:=true; end;
 if not fallo then raise exception 'Fallo: aceptación después de 25 minutos'; end if;
 if public._saldo_de(u)<>10000 or public._saldo_de(v)<>10000 then raise exception 'Se cobró una apuesta cerrada'; end if;
 fallo:=false;
 begin perform public.crear_apuesta_sala(r,2,gen_random_uuid()); exception when others then if sqlerrm not like 'Apuestas cerradas:%' then raise; end if; fallo:=true; end;
 if not fallo then raise exception 'Fallo: oferta después del límite'; end if;
 update public.salas set iniciada_at=clock_timestamp()-interval '24 minutes' where id=r;
 perform public.aceptar_apuesta_sala(apuesta);
 perform public.aceptar_apuesta_sala(apuesta);
 if public._saldo_de(u)<>9450 or public._saldo_de(v)<>9450 then raise exception 'Fallo de cobro o idempotencia'; end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 apuesta:=gen_random_uuid();
 saldo:=public.donar_saldo_seguro(v,100,'Prueba rollback',apuesta);
 perform public.donar_saldo_seguro(v,100,'Prueba rollback',apuesta);
 if public._saldo_de(u)<>9350 then raise exception 'Donación duplicada'; end if;
 apuesta:=gen_random_uuid();
 perform public.solicitar_retiro_seguro(500,'999999999',apuesta);
 perform public.solicitar_retiro_seguro(500,'999999999',apuesta);
 if public._saldo_de(u)<>8850 then raise exception 'Retiro duplicado'; end if;
end $$;
rollback;
select true as pruebas_integracion_revertidas;
