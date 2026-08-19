export type Policy = {
  sno: string;
  abhanumber: string;
  mobilenumber: string;
  memberid: string;
  payerid: string;
  productid: string | null;
  productname: string;
  processingid: string;
  policy_period?: { start: string; end: string } | null;
};
