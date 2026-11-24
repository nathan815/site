## Atlas: why it replaced AWX
Atlas replaced AWX for three reasons. AWX was slow. Keeping up with security vulnerabilities for FedRAMP compliance meant repeatedly upgrading the AWX stack. And the team wanted to move away from Ansible.

## Atlas: how it works
Atlas is a platform that exposes an AWX-compatible jobs API, so the services that call it (its clients) need minimal changes. In v1 it still runs Ansible. In v2 the team is rewriting the actual workflow business logic in C#. The speedup (30 to 50% faster jobs) comes from the Durable Functions runtime being event driven instead of polling, which removes overhead.

## Atlas: rollout
The rollout used dynamic routing between AWX and Atlas, controlled by a feature flag. Flipping the flag switches routing immediately, which made rollback instant. The team then rolled out gradually through the production rings, with bake time between rings to confirm nothing was going wrong before moving on.

## Atlas: why one instance per tenant
Atlas is deployed per tenant because Azure VMware Solution itself deploys its services per tenant. The service lives inside the tenant's private network with direct access to the hosts and appliances. For security and correctness it needs full separation between tenants.

## Atlas: storage design (Azure Storage vs SQL Server)
One of the harder tradeoffs was choosing between Azure Storage and SQL Server. The initial design used SQL Server. SQL would have given auto-increment IDs, relational queries and schemas. But because Atlas is per tenant, it would have needed a SQL database per tenant, which is significant operational overhead: managing many SQL servers, making sure they are deployed and healthy, scaling them and maintaining a pool of servers.

Nathan proposed moving to Azure Storage (blobs, queues and tables) while the team was evaluating the design, and that is what allowed the move off SQL Server. Durable Functions supports Azure Storage directly, but some of Atlas's APIs needed creative solutions:
- Auto-increment IDs: Storage tables do not support them, so Atlas generates IDs in the app layer by reading the current ID and adding 1, using an ETag for optimistic concurrency.
- Descending order: the jobs API must return jobs newest first, but Storage tables only return rows in ascending order. Nathan designed an inverted row key (max int minus the current ID) so that newest jobs sort first.

## Career story
Nathan started coding at age 12 and has loved it ever since. He began by building websites on Yola, a site-builder platform. He became very active in Yola's support forums, helping other users, and earned the title "Yola Champ". He started writing code inside Yola's custom HTML blocks, then moved on to building custom sites from scratch and learned backend development, mostly PHP. After his internship at Criteo he joined Microsoft straight out of college, on the Azure Dedicated team.

## How the role has grown
At first Nathan worked on assigned tasks. Now he decides what the team works on, who works on it, and runs the scrums. AI has also changed the industry, and in the past couple of years, especially the last one, he has had to learn a lot of new things. His work now looks very different: he manages many coding agents, often several running in parallel.
