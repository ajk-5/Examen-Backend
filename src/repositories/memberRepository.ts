export interface MemberRepository {
  exists(id: string): Promise<boolean>;
}
