use sysinfo::System;

pub fn get_ram() -> u64 {
    let mut sys = System::new_all();
    sys.refresh_all();

    sys.total_memory() / 1024 / 1024
}
