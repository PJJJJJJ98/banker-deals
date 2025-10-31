create: { name: cleaned, nameNormalized: norm }
          });

          const role =
            b && b.role ? String(b.role) : "Agent";

          await prisma.dealBank.create({
            data: {
              dealId: deal.id,
              bankId: bank.id,
              role: role as any
            }
          });
        }
      }

      console.log("Ingested", accession, companyName || cik);
    } catch (err) {
      console.error("Error processing filing", (f && (f.accession  f.accessionNo))  "", err);
    }
  }

  console.log("Discovery run complete");
}

