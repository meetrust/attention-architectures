import * as React from "react";
import { Table } from "@cloudflare/kumo";
import { GROUPS, REFS, VERSIONS, refLabel } from "../data";
import { Icon, SectionHead, Tail } from "./common";

/* ---------- 04 原表对照 ---------- */
export function SourceTable() {
  return (
    <section className="sec wrap" id="table" aria-labelledby="table-h">
      <SectionHead idx="04" title="原表对照" meta="Source table" id="table-h" />
      <p className="sec-lead"><Tail>与原文表格一致，方便引用；MiMo-V2-Flash 一行的层数已按官方 README 更正。参考文献编号可以跳到第 05 节。</Tail></p>
      <div className="tbl sticky-first src-tbl" tabIndex={0} role="region" aria-label="原表：11 组模型的 Attention 架构与技术路线">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>厂商 / 模型</Table.Head>
              <Table.Head>Attention 架构</Table.Head>
              <Table.Head>技术路线</Table.Head>
              <Table.Head>参考文献</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {GROUPS.map((g) => {
              const refs = [...new Set(g.versions.flatMap((v) => v.refs))];
              return (
                <Table.Row key={g.id}>
                  <Table.Cell>
                    <span className="t-no">{g.no}</span>
                    <span className="t-title"><Tail>{g.title}</Tail></span>
                  </Table.Cell>
                  <Table.Cell>
                    {g.versions.map((v) => (
                      <React.Fragment key={v.id}>
                        <span className="t-arch"><b>{v.name}：</b><Tail>{v.arch}</Tail></span>
                        {v.note ? <span className="t-note"><Tail>{`更正：${v.note}`}</Tail></span> : null}
                      </React.Fragment>
                    ))}
                  </Table.Cell>
                  <Table.Cell>
                    <span className="t-route">{g.stages.map((s) => s.route).join(" → ")}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="t-refs">
                      {refs.map((n) => (
                        <a key={n} href={`#ref-${refLabel(n)}`} aria-label={`参考文献 ${refLabel(n)}`}>[{refLabel(n)}]</a>
                      ))}
                    </span>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      </div>
    </section>
  );
}

/* ---------- 05 参考资料 ---------- */
export function Sources() {
  return (
    <section className="sec wrap" id="sources" aria-labelledby="sources-h">
      <SectionHead idx="05" title="参考资料" meta="Sources" id="sources-h" />
      <p className="sec-lead"><Tail>官方技术文档、模型仓库与公开研究论文，编号与原文一致。</Tail></p>
      <ol className="refs">
        {REFS.map((r) => {
          const used = VERSIONS.filter((v) => v.refs.includes(r.no)).map((v) => v.name);
          return (
            <li key={r.no} id={`ref-${refLabel(r.no)}`}>
              <span className="rno">{refLabel(r.no)}</span>
              <div>
                <a href={r.url} target="_blank" rel="noopener">
                  <span className="tx">{r.title}｜{r.kind}</span>
                  <Icon name="ext" />
                </a>
                <small>{r.src} · 对应 {used.join(" · ")}</small>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
