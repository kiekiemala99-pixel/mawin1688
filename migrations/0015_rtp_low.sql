-- House edge: drop every game RTP to the lowest allowed (1%).
update rtp_configs set rtp = 1, updated_at = now();
