export interface Account {
    username: string;
    password: string;
    uuid: string;
    dwspConnected: boolean;
    createdAt: string;
    dwspId: string;
}

export interface DwspAccount {
    uuid: string;
    username: string;
    name: string;
    group: boolean;
}
